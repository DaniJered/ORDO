from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Event, EventParticipant, Task, User, AuditLog
from app.schemas.event import EventCreate, EventUpdate, EventResponse, EventTeamMemberAdd
from app.core.responses import success_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/events", tags=["Events"])

def calculate_event_readiness(db: Session, event_id: str) -> float:
    tasks = db.query(Task).filter(Task.event_id == event_id, Task.deleted_at.is_(None)).all()
    if not tasks:
        return 0.0
    total = len(tasks)
    verified = sum(1 for t in tasks if t.status == "verified_complete")
    in_progress = sum(1 for t in tasks if t.status in ["in_progress", "completed_pending_evidence"])
    blocked = sum(1 for t in tasks if t.status == "blocked")
    
    score = (verified * 1.0 + in_progress * 0.4 - blocked * 0.2) / total * 100.0
    return max(0.0, min(100.0, round(score, 1)))

@router.get("", dependencies=[Depends(require_permission("event:read"))])
def list_events(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Event).filter(Event.deleted_at.is_(None))
    if status:
        query = query.filter(Event.status == status)
    if search:
        query = query.filter(Event.name.ilike(f"%{search}%"))
        
    total = query.count()
    events = query.order_by(Event.start_datetime.asc()).offset((page - 1) * page_size).limit(page_size).all()
    
    data = []
    for e in events:
        readiness = calculate_event_readiness(db, e.id)
        task_count = db.query(Task).filter(Task.event_id == e.id, Task.deleted_at.is_(None)).count()
        completed_count = db.query(Task).filter(
            Task.event_id == e.id, 
            Task.status == "verified_complete",
            Task.deleted_at.is_(None)
        ).count()
        data.append({
            "id": e.id,
            "name": e.name,
            "description": e.description,
            "type": e.type,
            "start_datetime": e.start_datetime.isoformat(),
            "end_datetime": e.end_datetime.isoformat(),
            "venue": e.venue,
            "expected_attendance": e.expected_attendance,
            "budget_estimate": e.budget_estimate,
            "status": e.status,
            "cover_image": e.cover_image,
            "readiness_score": readiness,
            "task_count": task_count,
            "completed_count": completed_count
        })
    return success_response(data, meta={"page": page, "page_size": page_size, "total": total})

@router.post("", dependencies=[Depends(require_permission("event:create"))])
def create_event(
    request: EventCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = Event(
        name=request.name,
        description=request.description,
        type=request.type,
        start_datetime=request.start_datetime,
        end_datetime=request.end_datetime,
        venue=request.venue,
        expected_attendance=request.expected_attendance,
        budget_estimate=request.budget_estimate,
        status=request.status,
        cover_image=request.cover_image,
        created_by=current_user.id,
        template_id=request.template_id
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Automatically add creator as coordinator participant
    participant = EventParticipant(
        event_id=event.id,
        user_id=current_user.id,
        role_in_event="coordinator"
    )
    db.add(participant)
    db.commit()

    return success_response({
        "id": event.id,
        "name": event.name,
        "status": event.status
    })

@router.get("/{event_id}", dependencies=[Depends(require_permission("event:read"))])
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id, Event.deleted_at.is_(None)).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
        
    tasks = db.query(Task).filter(Task.event_id == event_id, Task.deleted_at.is_(None)).all()
    participants = db.query(EventParticipant).filter(EventParticipant.event_id == event_id).all()
    
    total_tasks = len(tasks)
    verified = sum(1 for t in tasks if t.status == "verified_complete")
    blocked = sum(1 for t in tasks if t.status == "blocked")
    overdue = sum(1 for t in tasks if t.deadline < datetime.now(timezone.utc) and t.status != "verified_complete")
    pending_evidence = sum(1 for t in tasks if t.status == "completed_pending_evidence")
    readiness = calculate_event_readiness(db, event_id)

    team = []
    for p in participants:
        u = db.query(User).filter(User.id == p.user_id).first()
        if u:
            team.append({
                "participant_id": p.id,
                "user_id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role_in_event": p.role_in_event
            })

    return success_response({
        "id": event.id,
        "name": event.name,
        "description": event.description,
        "type": event.type,
        "start_datetime": event.start_datetime.isoformat(),
        "end_datetime": event.end_datetime.isoformat(),
        "venue": event.venue,
        "expected_attendance": event.expected_attendance,
        "budget_estimate": event.budget_estimate,
        "status": event.status,
        "cover_image": event.cover_image,
        "readiness_score": readiness,
        "metrics": {
            "total_tasks": total_tasks,
            "verified": verified,
            "blocked": blocked,
            "overdue": overdue,
            "pending_evidence": pending_evidence
        },
        "team": team
    })

@router.patch("/{event_id}", dependencies=[Depends(require_permission("event:update"))])
def update_event(event_id: str, request: EventUpdate, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id, Event.deleted_at.is_(None)).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    for field, val in request.model_dump(exclude_unset=True).items():
        setattr(event, field, val)
    db.commit()
    db.refresh(event)
    return success_response({"id": event.id, "name": event.name, "status": event.status})

@router.delete("/{event_id}", dependencies=[Depends(require_permission("event:delete"))])
def delete_event(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id, Event.deleted_at.is_(None)).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    event.deleted_at = datetime.now(timezone.utc)
    event.status = "archived"
    db.commit()
    return success_response({"message": "Event archived/soft-deleted successfully."})

@router.post("/{event_id}/team", dependencies=[Depends(require_permission("event:update"))])
def add_team_member(event_id: str, request: EventTeamMemberAdd, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id, Event.deleted_at.is_(None)).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    participant = EventParticipant(
        event_id=event_id,
        user_id=request.user_id,
        role_in_event=request.role_in_event
    )
    db.add(participant)
    db.commit()
    return success_response({"message": "Participant added to event team."})

