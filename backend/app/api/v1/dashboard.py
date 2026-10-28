from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.entities import (
    Event, Task, EvidenceRequirement, Approval, AutomationLog, AuditLog, ExtractedCommitment
)
from app.api.v1.events import calculate_event_readiness
from app.core.responses import success_response
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Executive Dashboard"])

@router.get("/stats")
def get_dashboard_stats(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    total_events = db.query(Event).filter(Event.deleted_at.is_(None)).count()
    active_tasks = db.query(Task).filter(
        Task.status.in_(["not_started", "in_progress", "completed_pending_evidence"]),
        Task.deleted_at.is_(None)
    ).count()
    completed_tasks = db.query(Task).filter(
        Task.status == "verified_complete",
        Task.deleted_at.is_(None)
    ).count()
    blocked_tasks = db.query(Task).filter(
        Task.status == "blocked",
        Task.deleted_at.is_(None)
    ).count()

    now = datetime.now(timezone.utc)
    overdue_tasks = db.query(Task).filter(
        Task.deadline < now,
        Task.status.notin_(["verified_complete", "cancelled"]),
        Task.deleted_at.is_(None)
    ).count()

    missing_evidence = db.query(EvidenceRequirement).filter(
        EvidenceRequirement.mandatory == True,
        EvidenceRequirement.verification_status != "verified"
    ).count()

    pending_approvals = db.query(Approval).filter(
        Approval.status == "pending"
    ).count()

    extraction_queue = db.query(ExtractedCommitment).filter(
        ExtractedCommitment.review_status == "pending"
    ).count()

    # Automation stats
    auto_success = db.query(AutomationLog).filter(AutomationLog.status == "success").count()
    auto_fail = db.query(AutomationLog).filter(AutomationLog.status == "failure").count()

    # Calculate average readiness across active events
    active_event_records = db.query(Event).filter(Event.deleted_at.is_(None)).all()
    readiness_scores = [calculate_event_readiness(db, e.id) for e in active_event_records]
    avg_readiness = round(sum(readiness_scores) / len(readiness_scores), 1) if readiness_scores else 0.0

    # Top critical risks (overdue or blocked critical tasks)
    risks_query = db.query(Task).filter(
        (Task.status == "blocked") | (Task.deadline < now),
        Task.status.notin_(["verified_complete", "cancelled"]),
        Task.deleted_at.is_(None)
    ).order_by(Task.priority.desc(), Task.deadline.asc()).limit(5).all()

    top_risks = [
        {
            "task_id": r.id,
            "event_id": r.event_id,
            "title": r.title,
            "priority": r.priority,
            "status": r.status,
            "blocked_reason": r.blocked_reason,
            "deadline": r.deadline.isoformat(),
            "department": r.department.name if r.department else None
        }
        for r in risks_query
    ]

    # "Today" panel: tasks owned by current user needing action
    my_tasks = db.query(Task).filter(
        Task.owner_id == current_user.id,
        Task.status.notin_(["verified_complete", "cancelled"]),
        Task.deleted_at.is_(None)
    ).order_by(Task.deadline.asc()).limit(5).all()

    today_panel = [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "deadline": t.deadline.isoformat(),
            "priority": t.priority
        }
        for t in my_tasks
    ]

    # Recent activity
    recent_activity = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(8).all()
    activity_timeline = [
        {
            "id": a.id,
            "action": a.action,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "details": a.new_value,
            "timestamp": a.timestamp.isoformat()
        }
        for a in recent_activity
    ]

    return success_response({
        "metrics": {
            "total_events": total_events,
            "active_tasks": active_tasks,
            "completed_tasks": completed_tasks,
            "blocked_tasks": blocked_tasks,
            "overdue_tasks": overdue_tasks,
            "missing_evidence": missing_evidence,
            "pending_approvals": pending_approvals,
            "ai_extraction_queue": extraction_queue,
            "automation_success": auto_success,
            "automation_failure": auto_fail,
            "event_readiness_score": avg_readiness
        },
        "top_risks": top_risks,
        "today_panel": today_panel,
        "activity_timeline": activity_timeline,
        "risk_radar_summary": "Active blocker identified: Sound & Light rigging cannot proceed until Principal Venue Approval is signed and verified. 2 marketing deliverables are overdue."
    })

