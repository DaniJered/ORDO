from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Approval, Event, User, AuditLog
from app.core.responses import success_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/approvals", tags=["Approvals Workflow"])

class ApprovalDecisionRequest(BaseModel):
    action: str # "approve" or "reject"
    comments: Optional[str] = None

@router.get("", dependencies=[Depends(require_permission("communication:approve"))])
def list_approvals(
    status: Optional[str] = None,
    event_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Approval)
    if status:
        query = query.filter(Approval.status == status)
    if event_id:
        query = query.filter(Approval.event_id == event_id)
        
    approvals = query.order_by(Approval.requested_at.desc()).all()
    data = [
        {
            "id": a.id,
            "event_id": a.event_id,
            "entity_type": a.entity_type,
            "entity_id": a.entity_id,
            "status": a.status,
            "comments": a.comments,
            "requested_at": a.requested_at.isoformat(),
            "decided_at": a.decided_at.isoformat() if a.decided_at else None
        }
        for a in approvals
    ]
    return success_response(data)

@router.post("/{approval_id}/decide", dependencies=[Depends(require_permission("communication:approve"))])
def decide_approval(
    approval_id: str,
    request: ApprovalDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found.")

    if request.action == "reject" and (not request.comments or not request.comments.strip()):
        raise HTTPException(status_code=400, detail="Rejection requires a mandatory explanation.")

    approval.status = "approved" if request.action == "approve" else "rejected"
    approval.comments = request.comments
    approval.approver_id = current_user.id
    approval.decided_at = datetime.now(timezone.utc)

    audit = AuditLog(
        actor_id=current_user.id,
        action=f"approval_{request.action}",
        entity_type="approval",
        entity_id=approval.id,
        old_value="pending",
        new_value=f"{approval.status}: {request.comments or ''}"
    )
    db.add(audit)
    db.commit()

    return success_response({
        "id": approval.id,
        "status": approval.status,
        "message": f"Approval {approval.status} successfully."
    })

