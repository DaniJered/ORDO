from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.entities import (
    Event, Task, EvidenceRequirement, AIRun, ExtractedCommitment, Department, User
)
from app.ai.service import ai_service
from app.ai.schemas import (
    CopilotResponse, SmartTaskBuilderResponse, CommitmentExtractionResponse,
    EvidenceClassificationResponse, CommunicationDraftResponse, DuplicateCheckResponse
)
from app.services.document_parser import extract_text_from_file
from app.core.responses import success_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/ai", tags=["ORDO AI Engine"])

class CopilotQueryRequest(BaseModel):
    event_id: str
    query: str

class TaskBuilderRequest(BaseModel):
    event_name: str
    event_description: str
    event_type: str = "Symposium"

class DraftCommunicationRequest(BaseModel):
    task_id: str
    reason: str = "overdue_reminder" # overdue_reminder, blocked_notice, missing_evidence
    tone: str = "default" # default, shorter, firmer, friendlier
    channel: str = "email"

class AdjustToneRequest(BaseModel):
    current_body: str
    target_tone: str # shorter, firmer, friendlier
    task_title: Optional[str] = None

class ConvertCommitmentRequest(BaseModel):
    department_id: Optional[str] = None
    owner_id: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = None

class EvidenceClassificationRequest(BaseModel):
    requirement_name: str
    requirement_description: Optional[str] = None
    extracted_document_text: str

@router.post("/copilot", dependencies=[Depends(require_permission("ai:query"))])
async def query_copilot(
    request: CopilotQueryRequest, 
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == request.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    tasks = db.query(Task).filter(Task.event_id == request.event_id, Task.deleted_at.is_(None)).all()
    evidence = db.query(EvidenceRequirement).join(Task).filter(Task.event_id == request.event_id).all()

    context = f"Event: {event.name} ({event.status})\n"
    context += f"Tasks ({len(tasks)}):\n"
    for t in tasks[:15]:
        context += f"- [{t.id}] {t.title}: Status={t.status}, Deadline={t.deadline.strftime('%Y-%m-%d')}, BlockedReason={t.blocked_reason}\n"
    context += f"\nEvidence Requirements:\n"
    for e in evidence[:10]:
        context += f"- [{e.id}] {e.name}: Status={e.verification_status}, Mandatory={e.mandatory}\n"
    context += f"\nUser Question: {request.query}"

    response = await ai_service.execute_structured_prompt(
        db=db,
        purpose="copilot",
        template_name="copilot.v1.md",
        user_input=context,
        schema_cls=CopilotResponse
    )
    return success_response(response.model_dump())

@router.post("/suggest-tasks", dependencies=[Depends(require_permission("event:create"))])
async def suggest_starter_tasks(
    request: TaskBuilderRequest,
    db: Session = Depends(get_db)
):
    user_input = f"Event: {request.event_name}\nType: {request.event_type}\nDescription: {request.event_description}"
    response = await ai_service.execute_structured_prompt(
        db=db,
        purpose="smart_task_builder",
        template_name="task_builder.v1.md",
        user_input=user_input,
        schema_cls=SmartTaskBuilderResponse
    )
    return success_response(response.model_dump())

@router.post("/extract-document", dependencies=[Depends(require_permission("communication:draft"))])
async def extract_commitments_from_file(
    event_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    content = await file.read()
    extracted_text, page_count, file_hash = extract_text_from_file(content, file.filename, db)

    user_input = f"Document: {file.filename} ({page_count} pages)\n\n{extracted_text[:4000]}"
    ai_res = await ai_service.execute_structured_prompt(
        db=db,
        purpose="commitment_extraction",
        template_name="commitment_extraction.v1.md",
        user_input=user_input,
        schema_cls=CommitmentExtractionResponse
    )

    created_commitments = []
    for item in ai_res.commitments:
        ec = ExtractedCommitment(
            event_id=event_id,
            source_doc_ref=file.filename,
            commitment_text=item.commitment_text,
            task_title=item.task_title,
            task_description=item.task_description,
            responsible_department=item.responsible_department,
            responsible_person=item.responsible_person,
            priority=item.priority,
            evidence_required=item.evidence_required,
            dependencies=item.dependencies,
            confidence_score=item.confidence_score,
            extraction_rationale=item.extraction_rationale,
            review_status="pending"
        )
        db.add(ec)
        db.commit()
        db.refresh(ec)
        created_commitments.append({
            "id": ec.id,
            "task_title": ec.task_title,
            "commitment_text": ec.commitment_text,
            "responsible_department": ec.responsible_department,
            "confidence_score": ec.confidence_score,
            "review_status": ec.review_status
        })

    return success_response({
        "document_name": file.filename,
        "page_count": page_count,
        "extracted_text_preview": extracted_text[:1200],
        "commitments": created_commitments
    })

@router.get("/commitments", dependencies=[Depends(require_permission("task:read"))])
def list_commitments(
    event_id: Optional[str] = None,
    review_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ExtractedCommitment)
    if event_id:
        query = query.filter(ExtractedCommitment.event_id == event_id)
    if review_status:
        query = query.filter(ExtractedCommitment.review_status == review_status)

    items = query.order_by(ExtractedCommitment.created_at.desc()).all()
    data = [
        {
            "id": c.id,
            "event_id": c.event_id,
            "source_doc_ref": c.source_doc_ref,
            "commitment_text": c.commitment_text,
            "task_title": c.task_title,
            "task_description": c.task_description,
            "responsible_department": c.responsible_department,
            "responsible_person": c.responsible_person,
            "priority": c.priority,
            "evidence_required": c.evidence_required,
            "dependencies": c.dependencies,
            "confidence_score": c.confidence_score,
            "extraction_rationale": c.extraction_rationale,
            "review_status": c.review_status,
            "converted_task_id": c.converted_task_id,
            "created_at": c.created_at.isoformat()
        }
        for c in items
    ]
    return success_response(data)

@router.post("/commitments/{commitment_id}/convert-task", dependencies=[Depends(require_permission("task:create"))])
def convert_commitment_to_task(
    commitment_id: str,
    request: Optional[ConvertCommitmentRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    c = db.query(ExtractedCommitment).filter(ExtractedCommitment.id == commitment_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Commitment not found.")

    # Match department if name provided
    dept_id = request.department_id if request and request.department_id else None
    if not dept_id and c.responsible_department:
        d = db.query(Department).filter(Department.name.ilike(f"%{c.responsible_department}%")).first()
        if d:
            dept_id = d.id

    now = datetime.now(timezone.utc)
    deadline = request.deadline if request and request.deadline else now + timedelta(days=7)
    priority = request.priority if request and request.priority else c.priority

    task = Task(
        event_id=c.event_id,
        title=c.task_title,
        description=c.task_description or c.commitment_text,
        department_id=dept_id,
        owner_id=request.owner_id if request else None,
        deadline=deadline,
        priority=priority or "medium",
        status="not_started",
        evidence_required=bool(c.evidence_required),
        created_by=current_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Attach evidence requirement if detected by AI
    if c.evidence_required:
        ev = EvidenceRequirement(
            task_id=task.id,
            name=c.evidence_required[:100],
            mandatory=True
        )
        db.add(ev)
        db.commit()

    c.review_status = "accepted"
    c.converted_task_id = task.id
    db.commit()

    return success_response({
        "message": "Commitment converted to task successfully.",
        "task_id": task.id,
        "task_title": task.title
    })

@router.post("/classify-evidence", dependencies=[Depends(require_permission("evidence:review"))])
async def classify_evidence_document(
    request: EvidenceClassificationRequest,
    db: Session = Depends(get_db)
):
    user_input = f"Expected Requirement: {request.requirement_name}\nDescription: {request.requirement_description}\n\nDocument Text:\n{request.extracted_document_text[:3000]}"
    res = await ai_service.execute_structured_prompt(
        db=db,
        purpose="evidence_classification",
        template_name="evidence_classification.v1.md",
        user_input=user_input,
        schema_cls=EvidenceClassificationResponse
    )
    return success_response(res.model_dump())

@router.post("/draft-communication", dependencies=[Depends(require_permission("communication:draft"))])
async def draft_communication(
    request: DraftCommunicationRequest,
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(Task.id == request.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    user_input = f"Task: {task.title}\nDeadline: {task.deadline.isoformat()}\nStatus: {task.status}\nBlockedReason: {task.blocked_reason}\nReason: {request.reason}\nTone: {request.tone}\nChannel: {request.channel}"
    res = await ai_service.execute_structured_prompt(
        db=db,
        purpose="communication_drafting",
        template_name="communication_drafting.v1.md",
        user_input=user_input,
        schema_cls=CommunicationDraftResponse
    )
    return success_response(res.model_dump())

@router.post("/adjust-tone", dependencies=[Depends(require_permission("communication:draft"))])
async def adjust_communication_tone(
    request: AdjustToneRequest,
    db: Session = Depends(get_db)
):
    user_input = f"Rewrite this message body with a '{request.target_tone}' tone while keeping essential task facts intact.\n\nOriginal Message:\n{request.current_body}"
    res = await ai_service.execute_structured_prompt(
        db=db,
        purpose="adjust_communication_tone",
        template_name="communication_drafting.v1.md",
        user_input=user_input,
        schema_cls=CommunicationDraftResponse
    )
    return success_response(res.model_dump())

@router.get("/usage", dependencies=[Depends(require_permission("user:read"))])
def get_ai_usage_stats(db: Session = Depends(get_db)):
    total_runs = db.query(AIRun).count()
    successful = db.query(AIRun).filter(AIRun.status == "success").count()
    failed = db.query(AIRun).filter(AIRun.status == "failure").count()
    total_tokens = db.query(func.sum(AIRun.tokens_used)).scalar() or 0
    total_cost = db.query(func.sum(AIRun.cost_estimate)).scalar() or 0.0
    avg_latency = db.query(func.avg(AIRun.latency_ms)).scalar() or 0

    recent_runs = db.query(AIRun).order_by(AIRun.created_at.desc()).limit(10).all()
    runs_data = [
        {
            "id": r.id,
            "purpose": r.purpose,
            "provider": r.provider,
            "tokens_used": r.tokens_used,
            "latency_ms": r.latency_ms,
            "status": r.status,
            "created_at": r.created_at.isoformat()
        }
        for r in recent_runs
    ]

    return success_response({
        "metrics": {
            "total_runs": total_runs,
            "successful": successful,
            "failed": failed,
            "total_tokens": total_tokens,
            "total_cost": round(total_cost, 4),
            "avg_latency_ms": round(avg_latency, 1)
        },
        "recent_runs": runs_data
    })
