import csv
import io
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.entities import Event, Task, EvidenceRequirement, Department, User
from app.automation.jobs import to_naive_utc

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/readiness/{event_id}")
def get_event_readiness(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    tasks = db.query(Task).filter(Task.event_id == event_id).all()
    total_tasks = len(tasks)
    if total_tasks == 0:
        return {
            "success": True,
            "data": {
                "event_id": event_id,
                "event_name": event.name,
                "readiness_score": 100.0,
                "risk_level": "Low",
                "components": {
                    "task_score": 40.0,
                    "evidence_score": 35.0,
                    "dependency_score": 25.0,
                    "overdue_penalty": 0.0,
                },
                "summary": {
                    "total_tasks": 0,
                    "completed_tasks": 0,
                    "blocked_tasks": 0,
                    "overdue_tasks": 0,
                    "total_evidence": 0,
                    "verified_evidence": 0,
                },
                "top_risks": [],
                "ai_recommendation": "No tasks created yet for this event.",
            },
        }

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    completed_tasks = sum(1 for t in tasks if t.status == "verified_complete")
    blocked_tasks = sum(1 for t in tasks if t.status == "blocked")
    overdue_tasks = sum(1 for t in tasks if t.deadline and to_naive_utc(t.deadline) < now and t.status != "verified_complete")

    task_ids = [t.id for t in tasks]
    requirements = db.query(EvidenceRequirement).filter(EvidenceRequirement.task_id.in_(task_ids)).all()
    total_reqs = len(requirements)
    verified_reqs = sum(1 for r in requirements if r.verification_status == "verified")

    # Component Calculations per docs/READINESS_SCORE.md
    task_ratio = completed_tasks / total_tasks
    ev_ratio = (verified_reqs / total_reqs) if total_reqs > 0 else 1.0
    unblocked_ratio = (total_tasks - blocked_tasks) / total_tasks

    task_score = round(task_ratio * 40.0, 1)
    evidence_score = round(ev_ratio * 35.0, 1)
    dependency_score = round(unblocked_ratio * 25.0, 1)
    overdue_penalty = round(overdue_tasks * 5.0, 1)

    raw_score = task_score + evidence_score + dependency_score - overdue_penalty
    readiness_score = round(max(0.0, min(100.0, raw_score)), 1)

    risk_level = "Low" if readiness_score >= 75.0 else "Medium" if readiness_score >= 50.0 else "High"

    # Identify Top 5 critical risks
    top_risks = []
    for t in tasks:
        is_overdue = t.deadline and to_naive_utc(t.deadline) < now and t.status != "verified_complete"
        is_blocked = t.status == "blocked"
        if is_overdue or is_blocked:
            top_risks.append({
                "task_id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "is_overdue": bool(is_overdue),
                "is_blocked": bool(is_blocked),
                "blocked_reason": t.blocked_reason,
            })
    top_risks = top_risks[:5]

    # AI Recommendation Brief
    if overdue_tasks > 0:
        rec = f"Action Required: {overdue_tasks} overdue tasks are penalizing readiness by {overdue_penalty}%. Expedite evidence sign-off for critical path tasks."
    elif blocked_tasks > 0:
        rec = f"Bottleneck Alert: {blocked_tasks} tasks are currently blocked. Verify prerequisite approvals to cascade downstream progress."
    else:
        rec = "Workflow on track. Maintain evidence review pace to achieve 100% verified status before event day."

    return {
        "success": True,
        "data": {
            "event_id": event_id,
            "event_name": event.name,
            "readiness_score": readiness_score,
            "risk_level": risk_level,
            "components": {
                "task_score": task_score,
                "evidence_score": evidence_score,
                "dependency_score": dependency_score,
                "overdue_penalty": overdue_penalty,
            },
            "summary": {
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "blocked_tasks": blocked_tasks,
                "overdue_tasks": overdue_tasks,
                "total_evidence": total_reqs,
                "verified_evidence": verified_reqs,
            },
            "top_risks": top_risks,
            "ai_recommendation": rec,
        },
    }

@router.get("/department-risks/{event_id}")
def get_department_risks(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    departments = db.query(Department).all()
    tasks = db.query(Task).filter(Task.event_id == event_id).all()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    dept_map = {d.id: d.name for d in departments}
    results = []

    for d in departments:
        dept_tasks = [t for t in tasks if t.department_id == d.id]
        total = len(dept_tasks)
        if total == 0:
            continue

        completed = sum(1 for t in dept_tasks if t.status == "verified_complete")
        blocked = sum(1 for t in dept_tasks if t.status == "blocked")
        overdue = sum(1 for t in dept_tasks if t.deadline and to_naive_utc(t.deadline) < now and t.status != "verified_complete")

        # Department risk calculation
        risk_weight = (blocked * 2) + (overdue * 3)
        risk_level = "High" if risk_weight >= 4 else "Medium" if risk_weight >= 2 else "Low"

        results.append({
            "department_id": d.id,
            "department_name": d.name,
            "total_tasks": total,
            "completed_tasks": completed,
            "blocked_tasks": blocked,
            "overdue_tasks": overdue,
            "risk_level": risk_level,
            "completion_percentage": round((completed / total) * 100, 1),
        })

    return {"success": True, "data": results}

@router.get("/export/csv/{event_id}")
def export_event_csv(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    tasks = db.query(Task).filter(Task.event_id == event_id).all()
    departments = {d.id: d.name for d in db.query(Department).all()}

    output = io.StringIO()
    writer = csv.writer(output)

    # Write Header
    writer.writerow([
        "Task ID",
        "Event Name",
        "Task Title",
        "Department",
        "Priority",
        "Status",
        "Deadline",
        "Progress (%)",
        "Blocked Reason",
        "Evidence Count",
        "Created At",
    ])

    for t in tasks:
        dept_name = departments.get(t.department_id, "General")
        ev_count = len(t.evidence_requirements) if t.evidence_requirements else 0
        writer.writerow([
            t.id,
            event.name,
            t.title,
            dept_name,
            t.priority,
            t.status,
            t.deadline.isoformat() if t.deadline else "",
            t.progress_percentage,
            t.blocked_reason or "",
            ev_count,
            t.created_at.isoformat() if t.created_at else "",
        ])

    output.seek(0)
    filename = f"{event.name.replace(' ', '_')}_workflow_report.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
