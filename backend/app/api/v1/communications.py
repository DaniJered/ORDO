from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import CommunicationDraft, Task, Contact, ContactChannel, FeatureFlag, AutomationLog, User
from app.integrations.registry import get_adapter
from app.core.responses import success_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/communications", tags=["Communications & Drafts"])

class CreateDraftRequest(BaseModel):
    event_id: str
    task_id: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    channel: str = "email" # email, whatsapp
    subject: Optional[str] = None
    body: str

class UpdateDraftRequest(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    channel: Optional[str] = None

@router.get("", dependencies=[Depends(require_permission("task:read"))])
def list_drafts(
    event_id: Optional[str] = None,
    approval_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CommunicationDraft)
    if event_id:
        query = query.filter(CommunicationDraft.event_id == event_id)
    if approval_status:
        query = query.filter(CommunicationDraft.approval_status == approval_status)

    drafts = query.order_by(CommunicationDraft.created_at.desc()).all()
    data = [
        {
            "id": d.id,
            "event_id": d.event_id,
            "task_id": d.task_id,
            "recipient_email": d.recipient_email,
            "recipient_phone": d.recipient_phone,
            "channel": d.channel,
            "subject": d.subject,
            "body": d.body,
            "approval_status": d.approval_status,
            "approved_by": d.approved_by,
            "sent_at": d.sent_at.isoformat() if d.sent_at else None,
            "created_at": d.created_at.isoformat()
        }
        for d in drafts
    ]
    return success_response(data)

@router.post("", dependencies=[Depends(require_permission("communication:draft"))])
def create_draft(
    request: CreateDraftRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    draft = CommunicationDraft(
        event_id=request.event_id,
        task_id=request.task_id,
        recipient_email=request.recipient_email,
        recipient_phone=request.recipient_phone,
        channel=request.channel,
        subject=request.subject,
        body=request.body,
        approval_status="draft"
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return success_response({
        "id": draft.id,
        "subject": draft.subject,
        "approval_status": draft.approval_status
    })

@router.patch("/{draft_id}", dependencies=[Depends(require_permission("communication:draft"))])
def update_draft(
    draft_id: str,
    request: UpdateDraftRequest,
    db: Session = Depends(get_db)
):
    draft = db.query(CommunicationDraft).filter(CommunicationDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")
    for field, val in request.model_dump(exclude_unset=True).items():
        setattr(draft, field, val)
    db.commit()
    db.refresh(draft)
    return success_response({"id": draft.id, "subject": draft.subject, "body": draft.body})

@router.post("/{draft_id}/approve", dependencies=[Depends(require_permission("communication:approve"))])
def approve_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    draft = db.query(CommunicationDraft).filter(CommunicationDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")
    draft.approval_status = "approved"
    draft.approved_by = current_user.id
    db.commit()
    return success_response({"id": draft.id, "approval_status": "approved"})

@router.post("/{draft_id}/send", dependencies=[Depends(require_permission("communication:approve"))])
async def dispatch_communication(
    draft_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    draft = db.query(CommunicationDraft).filter(CommunicationDraft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    # 1. Kill switch check (§10 & §11)
    kill_switch = db.query(FeatureFlag).filter(FeatureFlag.key == "global_kill_switch").first()
    if kill_switch and kill_switch.is_enabled:
        raise HTTPException(
            status_code=403,
            detail="Global Kill-Switch is ACTIVE. Outbound dispatches are paused."
        )

    # 2. Approval check (§5.C)
    if draft.approval_status != "approved":
        raise HTTPException(
            status_code=400,
            detail="Message draft must be approved before dispatch."
        )

    # 3. WhatsApp Opt-in check (§7 & §11)
    adapter_key = "smtp" if draft.channel == "email" else "whatsapp_cloud"
    is_opted_in = True
    target = draft.recipient_email if draft.channel == "email" else draft.recipient_phone

    if draft.channel == "whatsapp":
        # Check contact channel opt-in record
        ch = db.query(ContactChannel).join(Contact).filter(
            Contact.phone == draft.recipient_phone,
            ContactChannel.channel == "whatsapp"
        ).first()
        is_opted_in = ch.is_opted_in if ch else False

    adapter = get_adapter(adapter_key)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Adapter '{adapter_key}' not found.")

    result = await adapter.send({
        "to": target,
        "subject": draft.subject,
        "body": draft.body,
        "is_opted_in": is_opted_in
    })

    # Log to automation_logs
    log = AutomationLog(
        job_name=f"dispatch_{adapter_key}",
        input_data=f"Target: {target}, Channel: {draft.channel}",
        result=f"Success: {result.success}, ID: {result.message_id}",
        status="success" if result.success else "failure",
        error_message=result.error,
        actor=current_user.email
    )
    db.add(log)

    if not result.success:
        db.commit()
        raise HTTPException(status_code=400, detail=result.error)

    draft.approval_status = "sent"
    draft.sent_at = datetime.now(timezone.utc)
    db.commit()

    return success_response({
        "message": f"Message dispatched via {adapter.name}",
        "result": result.model_dump()
    })

