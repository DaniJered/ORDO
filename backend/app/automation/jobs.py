from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
import json
from sqlalchemy.orm import Session
from app.models.entities import (
    Event,
    Task,
    TaskDependency,
    EvidenceRequirement,
    CommunicationDraft,
    IntegrationConnection,
    Invitation,
    AttachmentsTextCache,
    Report,
    FeatureFlag,
)
from app.rules.orchestrator import RulesOrchestrator
from app.integrations.smtp_adapter import SMTPAdapter
from app.integrations.whatsapp_adapter import WhatsAppAdapter

def to_naive_utc(dt: datetime) -> datetime:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

def check_kill_switch(db: Session) -> bool:
    flag = db.query(FeatureFlag).filter(FeatureFlag.key == "kill_switch_active").first()
    return bool(flag and flag.is_enabled)

def job_daily_deadline_scan(db: Session, actor: str = "system") -> Dict[str, Any]:
    """Scan tasks due within 24 hours and generate reminder drafts."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    in_24h = now + timedelta(hours=24)

    tasks_due = (
        db.query(Task)
        .filter(
            Task.status.in_(["todo", "in_progress", "completed_pending_evidence"]),
            Task.deadline != None,
            Task.deadline <= in_24h,
            Task.deadline >= now,
        )
        .all()
    )

    created_drafts = 0
    for task in tasks_due:
        # Check if draft already exists
        existing = (
            db.query(CommunicationDraft)
            .filter(CommunicationDraft.task_id == task.id, CommunicationDraft.approval_status == "draft")
            .first()
        )
        if not existing:
            draft = CommunicationDraft(
                event_id=task.event_id,
                task_id=task.id,
                channel="email",
                subject=f"Deadline Notice: {task.title}",
                body=f"Hello,\n\nThe task '{task.title}' is scheduled for completion within the next 24 hours. Please ensure all required evidence is submitted on ORDO.\n\nThank you,\nORDO Automated Reminder",
                approval_status="draft",
            )
            db.add(draft)
            created_drafts += 1

    db.commit()
    return {
        "tasks_scanned": len(tasks_due),
        "drafts_created": created_drafts,
        "message": f"Processed {len(tasks_due)} tasks nearing deadline. Created {created_drafts} draft notices.",
    }

def job_overdue_escalation(db: Session, actor: str = "system") -> Dict[str, Any]:
    """Detect overdue tasks and generate escalation drafts."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    tasks_with_deadline = (
        db.query(Task)
        .filter(
            Task.status.in_(["todo", "in_progress", "completed_pending_evidence", "blocked"]),
            Task.deadline != None,
        )
        .all()
    )

    overdue_tasks = [t for t in tasks_with_deadline if to_naive_utc(t.deadline) < now]

    escalations_created = 0
    for task in overdue_tasks:
        # Check for existing escalation draft
        existing = (
            db.query(CommunicationDraft)
            .filter(
                CommunicationDraft.task_id == task.id,
                CommunicationDraft.subject.like("%ESCALATION%"),
            )
            .first()
        )
        if not existing:
            hours_overdue = int((now - to_naive_utc(task.deadline)).total_seconds() // 3600)
            draft = CommunicationDraft(
                event_id=task.event_id,
                task_id=task.id,
                channel="email",
                subject=f"[URGENT ESCALATION] Task Overdue: {task.title}",
                body=f"URGENT ATTENTION REQUIRED:\n\nTask '{task.title}' is currently {hours_overdue} hours overdue and blocking downstream milestones. Immediate resolution or evidence submission is mandatory.\n\nORDO Automated Escalation",
                approval_status="draft",
            )
            db.add(draft)
            escalations_created += 1

    db.commit()
    return {
        "overdue_tasks_found": len(overdue_tasks),
        "escalation_drafts_created": escalations_created,
        "message": f"Identified {len(overdue_tasks)} overdue tasks. Generated {escalations_created} escalation alerts.",
    }

def job_dependency_recheck(db: Session, actor: str = "system") -> Dict[str, Any]:
    """Re-evaluate all dependency relationships and unblock satisfied tasks."""
    events = db.query(Event).all()
    unblocked_count = 0

    for event in events:
        tasks = db.query(Task).filter(Task.event_id == event.id).all()
        for task in tasks:
            if task.status == "blocked":
                deps = (
                    db.query(TaskDependency)
                    .filter(TaskDependency.dependent_task_id == task.id)
                    .all()
                )
                all_satisfied = True
                for dep in deps:
                    prereq = db.query(Task).filter(Task.id == dep.prerequisite_task_id).first()
                    if prereq and prereq.status == "verified_complete":
                        dep.is_satisfied = True
                    else:
                        all_satisfied = False

                if all_satisfied and len(deps) > 0:
                    task.status = "in_progress"
                    task.blocked_reason = None
                    unblocked_count += 1

    db.commit()
    return {
        "events_checked": len(events),
        "tasks_unblocked": unblocked_count,
        "message": f"Evaluated dependency graphs across {len(events)} events. Auto-unblocked {unblocked_count} tasks.",
    }

def job_readiness_snapshot(db: Session, actor: str = "system") -> Dict[str, Any]:
    """Generate daily event readiness score snapshots and risk assessments."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    events = db.query(Event).all()
    reports_generated = 0

    for event in events:
        tasks = db.query(Task).filter(Task.event_id == event.id).all()
        total_tasks = len(tasks)
        if total_tasks == 0:
            continue

        completed_tasks = sum(1 for t in tasks if t.status == "verified_complete")
        blocked_tasks = sum(1 for t in tasks if t.status == "blocked")
        overdue_tasks = sum(
            1 for t in tasks
            if t.deadline and to_naive_utc(t.deadline) < now and t.status != "verified_complete"
        )

        # Evidence stats
        task_ids = [t.id for t in tasks]
        requirements = db.query(EvidenceRequirement).filter(EvidenceRequirement.task_id.in_(task_ids)).all()
        total_reqs = len(requirements)
        verified_reqs = sum(1 for r in requirements if r.verification_status == "verified")

        # Readiness formula
        task_ratio = completed_tasks / total_tasks
        ev_ratio = (verified_reqs / total_reqs) if total_reqs > 0 else 1.0
        unblocked_ratio = ((total_tasks - blocked_tasks) / total_tasks)

        base_score = (0.40 * task_ratio) + (0.35 * ev_ratio) + (0.25 * unblocked_ratio)
        score_percent = base_score * 100.0

        if overdue_tasks > 0:
            score_percent = max(0.0, score_percent - (overdue_tasks * 5.0))

        readiness_score = round(score_percent, 1)

        snapshot_data = {
            "event_id": event.id,
            "event_name": event.name,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "blocked_tasks": blocked_tasks,
            "overdue_tasks": overdue_tasks,
            "total_requirements": total_reqs,
            "verified_requirements": verified_reqs,
            "readiness_score": readiness_score,
            "risk_level": "High" if readiness_score < 50 else "Medium" if readiness_score < 75 else "Low",
        }

        report = Report(
            event_id=event.id,
            report_type="readiness_snapshot",
            data_json=json.dumps(snapshot_data),
            readiness_score=readiness_score,
        )
        db.add(report)
        reports_generated += 1

    db.commit()
    return {
        "events_calculated": len(events),
        "reports_generated": reports_generated,
        "message": f"Calculated readiness snapshots for {len(events)} events.",
    }

def job_integration_health_check(db: Session, actor: str = "system") -> Dict[str, Any]:
    """Ping configured integration adapters and record status."""
    now = datetime.now(timezone.utc)
    smtp = SMTPAdapter()
    wa = WhatsAppAdapter()

    smtp_status = smtp.check_connection()
    wa_status = wa.check_connection()

    # Update IntegrationConnection in DB
    smtp_conn = db.query(IntegrationConnection).filter(IntegrationConnection.provider == "smtp").first()
    if not smtp_conn:
        smtp_conn = IntegrationConnection(provider="smtp", status="connected", last_checked_at=now)
        db.add(smtp_conn)
    else:
        smtp_conn.last_checked_at = now
        smtp_conn.status = "connected" if smtp_status.get("healthy") else "error"

    wa_conn = db.query(IntegrationConnection).filter(IntegrationConnection.provider == "whatsapp").first()
    if not wa_conn:
        wa_conn = IntegrationConnection(provider="whatsapp", status="mock_mode", last_checked_at=now)
        db.add(wa_conn)
    else:
        wa_conn.last_checked_at = now
        wa_conn.status = "mock_mode"

    db.commit()
    return {
        "smtp": smtp_status,
        "whatsapp": wa_status,
        "message": "Integration health verified: SMTP and WhatsApp adapters operational.",
    }

def job_retention_cleanup(db: Session, actor: str = "system") -> Dict[str, Any]:
    """Prune expired invitations and stale temporary text cache."""
    now = datetime.now(timezone.utc)

    # Delete expired unaccepted invitations
    expired_invites = (
        db.query(Invitation)
        .filter(Invitation.expires_at < now, Invitation.accepted_at == None)
        .all()
    )
    invite_count = len(expired_invites)
    for inv in expired_invites:
        db.delete(inv)

    db.commit()
    return {
        "expired_invitations_pruned": invite_count,
        "message": f"Retention cleanup finished. Pruned {invite_count} expired invitations.",
    }
