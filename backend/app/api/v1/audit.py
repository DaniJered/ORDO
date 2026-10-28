from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import AuditLog, User
from app.core.responses import success_response
from app.api.deps import require_permission

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("", dependencies=[Depends(require_permission("audit:read"))])
def list_audit_logs(
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))

    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset((page - 1) * page_size).limit(page_size).all()

    data = []
    for log in logs:
        actor_name = "System"
        if log.actor_id and log.actor_id != "system_rules_engine":
            u = db.query(User).filter(User.id == log.actor_id).first()
            if u:
                actor_name = u.full_name
        elif log.actor_id == "system_rules_engine":
            actor_name = "Deterministic Rules Engine"

        data.append({
            "id": log.id,
            "actor_id": log.actor_id,
            "actor_name": actor_name,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "ip_address": log.ip_address,
            "timestamp": log.timestamp.isoformat()
        })

    return success_response(data, meta={"page": page, "page_size": page_size, "total": total})

