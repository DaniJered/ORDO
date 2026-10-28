from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import User, FeatureFlag, AutomationLog
from app.integrations.registry import list_all_integrations, get_adapter
from app.schemas.integration import TestIntegrationRequest, SendTestMessageRequest
from app.core.config import settings
from app.core.responses import success_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/integrations", tags=["Integrations Hub"])

@router.get("", dependencies=[Depends(require_permission("user:read"))])
def get_integrations_list():
    integrations = list_all_integrations()
    return success_response(integrations)

@router.post("/{key}/test", dependencies=[Depends(require_permission("integration:test"))])
async def test_integration_connection(key: str):
    adapter = get_adapter(key)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Integration provider '{key}' not found.")
    result = await adapter.health_check()
    return success_response(result.model_dump())

@router.post("/{key}/send-test", dependencies=[Depends(require_permission("integration:test"))])
async def send_test_message(
    key: str, 
    request: SendTestMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Rule check: Kill switch active? (§10 & §11)
    kill_switch = db.query(FeatureFlag).filter(FeatureFlag.key == "global_kill_switch").first()
    if kill_switch and kill_switch.is_enabled:
        raise HTTPException(
            status_code=403,
            detail="Global Kill-Switch is ACTIVE. All outbound messaging is paused by administrator."
        )

    adapter = get_adapter(key)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Integration provider '{key}' not found.")

    # Target safety: test message sent strictly to current user (§7)
    target_destination = current_user.email if request.channel == "email" else (current_user.phone or request.to)
    
    send_payload = {
        "to": target_destination,
        "subject": request.subject,
        "body": request.body,
        "is_opted_in": True # Current user performing self-test is considered opted-in
    }

    result = await adapter.send(send_payload)

    # Log to automation_logs (§10)
    log = AutomationLog(
        job_name=f"test_send_{key}",
        input_data=f"To: {target_destination}, Channel: {request.channel}",
        result=f"Success: {result.success}, ID: {result.message_id}, Mock: {result.mock_mode}",
        status="success" if result.success else "failure",
        error_message=result.error,
        actor=current_user.email
    )
    db.add(log)
    db.commit()

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return success_response({
        "message": f"Test message dispatched via {adapter.name}.",
        "result": result.model_dump()
    })

