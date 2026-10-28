from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Task, TaskDependency, EvidenceRequirement, AuditLog
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, DependencyCreate
from app.rules.dependency_rules import check_circular_dependency
from app.rules.orchestrator import RulesOrchestrator
from app.core.responses import success_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("", dependencies=[Depends(require_permission("task:read"))])
def list_tasks(
    event_id: Optional[str] = None,
    department_id: Optional[str] = None,
    owner_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Task).filter(Task.deleted_at.is_(None))
    if event_id:
        query = query.filter(Task.event_id == event_id)
    if department_id:
        query = query.filter(Task.department_id == department_id)
    if owner_id:
        query = query.filter(Task.owner_id == owner_id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        query = query.filter(Task.title.ilike(f"%{search}%"))

    total = query.count()
    tasks = query.order_by(Task.deadline.asc()).offset((page - 1) * page_size).limit(page_size).all()

    data = []
    for t in tasks:
        evidence_reqs = [
            {
                "id": r.id,
                "name": r.name,
                "mandatory": r.mandatory,
                "verification_status": r.verification_status
            }
            for r in t.evidence_requirements
        ]
        deps = [
            {
                "id": d.id,
                "depends_on_task_id": d.depends_on_task_id,
                "depends_on_title": d.depends_on_task.title if d.depends_on_task else None,
                "is_satisfied": d.is_satisfied
            }
            for d in t.outgoing_dependencies
        ]
        data.append({
            "id": t.id,
            "event_id": t.event_id,
            "title": t.title,
            "description": t.description,
            "department_id": t.department_id,
            "department_name": t.department.name if t.department else None,
            "owner_id": t.owner_id,
            "owner_name": t.owner.full_name if t.owner else None,
            "deadline": t.deadline.isoformat(),
            "priority": t.priority,
            "status": t.status,
            "progress_percentage": t.progress_percentage,
            "evidence_required": t.evidence_required,
            "blocked_reason": t.blocked_reason,
            "evidence_requirements": evidence_reqs,
            "dependencies": deps
        })

    return success_response(data, meta={"page": page, "page_size": page_size, "total": total})

@router.post("", dependencies=[Depends(require_permission("task:create"))])
def create_task(
    request: TaskCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = Task(
        event_id=request.event_id,
        title=request.title,
        description=request.description,
        department_id=request.department_id,
        owner_id=request.owner_id,
        deadline=request.deadline,
        priority=request.priority,
        status=request.status,
        evidence_required=request.evidence_required or bool(request.evidence_requirements),
        created_by=current_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Add evidence requirements if provided
    if request.evidence_requirements:
        for req in request.evidence_requirements:
            ev = EvidenceRequirement(
                task_id=task.id,
                name=req.name,
                description=req.description,
                file_types_allowed=req.file_types_allowed,
                mandatory=req.mandatory
            )
            db.add(ev)
        db.commit()

    # Add dependencies if provided
    if request.dependencies:
        # Check cycles for each dependency
        existing_edges = [
            (d.task_id, d.depends_on_task_id) for d in db.query(TaskDependency).all()
        ]
        for dep_task_id in request.dependencies:
            if check_circular_dependency(task.id, dep_task_id, existing_edges):
                raise HTTPException(
                    status_code=400,
                    detail=f"Circular dependency detected between task '{task.title}' and prerequisite ID '{dep_task_id}'."
                )
            dep = TaskDependency(
                task_id=task.id,
                depends_on_task_id=dep_task_id
            )
            db.add(dep)
            existing_edges.append((task.id, dep_task_id))
        db.commit()

    # Re-evaluate task blocked state
    RulesOrchestrator.reevaluate_task(db, task.id)
    db.refresh(task)

    return success_response({
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "blocked_reason": task.blocked_reason
    })

@router.get("/{task_id}", dependencies=[Depends(require_permission("task:read"))])
def get_task(task_id: str, db: Session = Depends(get_db)):
    t = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found.")

    evidence_reqs = [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "file_types_allowed": r.file_types_allowed,
            "mandatory": r.mandatory,
            "verification_status": r.verification_status
        }
        for r in t.evidence_requirements
    ]
    deps = [
        {
            "id": d.id,
            "depends_on_task_id": d.depends_on_task_id,
            "depends_on_title": d.depends_on_task.title if d.depends_on_task else None,
            "is_satisfied": d.is_satisfied
        }
        for d in t.outgoing_dependencies
    ]

    return success_response({
        "id": t.id,
        "event_id": t.event_id,
        "title": t.title,
        "description": t.description,
        "department_id": t.department_id,
        "department_name": t.department.name if t.department else None,
        "owner_id": t.owner_id,
        "owner_name": t.owner.full_name if t.owner else None,
        "deadline": t.deadline.isoformat(),
        "priority": t.priority,
        "status": t.status,
        "progress_percentage": t.progress_percentage,
        "evidence_required": t.evidence_required,
        "blocked_reason": t.blocked_reason,
        "evidence_requirements": evidence_reqs,
        "dependencies": deps
    })

@router.patch("/{task_id}", dependencies=[Depends(require_permission("task:update"))])
def update_task(task_id: str, request: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    # Guard: Cannot directly mark Verified Complete via patch if rules fail
    update_data = request.model_dump(exclude_unset=True)
    if update_data.get("status") == "verified_complete":
        can_complete, reason = RulesOrchestrator.check_can_complete(db, task_id)
        if not can_complete:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot mark Verified Complete: {reason}"
            )

    for field, val in update_data.items():
        setattr(task, field, val)
        
    db.commit()
    db.refresh(task)

    # Re-evaluate all dependent tasks if status changed
    incoming = db.query(TaskDependency).filter(TaskDependency.depends_on_task_id == task_id).all()
    for dep in incoming:
        RulesOrchestrator.reevaluate_task(db, dep.task_id)

    return success_response({
        "id": task.id,
        "title": task.title,
        "status": task.status,
        "progress_percentage": task.progress_percentage
    })

@router.post("/{task_id}/dependencies", dependencies=[Depends(require_permission("task:create"))])
def add_dependency(task_id: str, request: DependencyCreate, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    dep_task = db.query(Task).filter(Task.id == request.depends_on_task_id).first()
    if not task or not dep_task:
        raise HTTPException(status_code=404, detail="One or both tasks not found.")

    existing_edges = [
        (d.task_id, d.depends_on_task_id) for d in db.query(TaskDependency).all()
    ]

    # Check for circular dependency
    if check_circular_dependency(task_id, request.depends_on_task_id, existing_edges):
        raise HTTPException(
            status_code=400,
            detail=f"Circular dependency rejected: task '{task.title}' cannot depend on '{dep_task.title}' as it would create a cyclic graph."
        )

    dep = TaskDependency(
        task_id=task_id,
        depends_on_task_id=request.depends_on_task_id,
        dependency_type=request.dependency_type
    )
    db.add(dep)
    db.commit()

    # Trigger re-evaluation
    RulesOrchestrator.reevaluate_task(db, task_id)
    db.refresh(task)

    return success_response({
        "message": f"Dependency created: '{task.title}' depends on '{dep_task.title}'",
        "task_status": task.status,
        "blocked_reason": task.blocked_reason
    })

@router.post("/{task_id}/verify-complete", dependencies=[Depends(require_permission("task:update"))])
def verify_complete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    can_complete, reason = RulesOrchestrator.check_can_complete(db, task_id)
    if not can_complete:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark Verified Complete: {reason}"
        )

    task.status = "verified_complete"
    task.progress_percentage = 100
    task.blocked_reason = None
    db.commit()

    # Re-evaluate dependent tasks
    incoming = db.query(TaskDependency).filter(TaskDependency.depends_on_task_id == task_id).all()
    for dep in incoming:
        dep.is_satisfied = True
        RulesOrchestrator.reevaluate_task(db, dep.task_id)
    db.commit()

    return success_response({
        "id": task.id,
        "status": task.status,
        "message": "Task successfully verified complete."
    })

