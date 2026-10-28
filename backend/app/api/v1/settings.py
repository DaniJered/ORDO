from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import FeatureFlag, AuditLog, User
from app.schemas.settings import SystemSettings, KillSwitchToggle, FeatureFlagUpdate
from app.core.config import settings
from app.core.responses import success_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/settings", tags=["Settings & Administration"])

@router.get("/system", dependencies=[Depends(require_permission("user:read"))])
def get_system_settings(db: Session = Depends(get_db)):
    kill_switch = db.query(FeatureFlag).filter(FeatureFlag.key == "global_kill_switch").first()
    is_kill_switch_active = kill_switch.is_enabled if kill_switch else settings.KILL_SWITCH_ACTIVE
    
    return success_response({
        "kill_switch_active": is_kill_switch_active,
        "mock_integrations": settings.MOCK_INTEGRATIONS,
        "ai_provider": settings.AI_PROVIDER,
        "environment": "development"
    })

@router.post("/system/kill-switch", dependencies=[Depends(require_permission("system:kill_switch"))])
def toggle_kill_switch(
    request: KillSwitchToggle, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    flag = db.query(FeatureFlag).filter(FeatureFlag.key == "global_kill_switch").first()
    if not flag:
        flag = FeatureFlag(
            key="global_kill_switch",
            name="Global Kill Switch",
            description="Emergency pause on all background automation and outbound message dispatch.",
            is_enabled=request.active
        )
        db.add(flag)
    else:
        flag.is_enabled = request.active
        
    audit = AuditLog(
        actor_id=current_user.id,
        action="kill_switch_toggle",
        entity_type="system",
        entity_id="global_kill_switch",
        old_value=str(not request.active),
        new_value=str(request.active)
    )
    db.add(audit)
    db.commit()

    return success_response({
        "kill_switch_active": flag.is_enabled,
        "message": f"Global Kill-Switch is now {'ACTIVE (automation paused)' if flag.is_enabled else 'DEACTIVATED (normal operation)'}."
    })

@router.get("/feature-flags", dependencies=[Depends(require_permission("user:read"))])
def list_feature_flags(db: Session = Depends(get_db)):
    flags = db.query(FeatureFlag).all()
    data = [
        {
            "id": f.id,
            "key": f.key,
            "name": f.name,
            "description": f.description,
            "is_enabled": f.is_enabled,
            "scope": f.scope
        }
        for f in flags
    ]
    return success_response(data)

@router.patch("/feature-flags/{key}", dependencies=[Depends(require_permission("system:feature_flags"))])
def update_feature_flag(key: str, request: FeatureFlagUpdate, db: Session = Depends(get_db)):
    flag = db.query(FeatureFlag).filter(FeatureFlag.key == key).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Feature flag not found.")
    flag.is_enabled = request.is_enabled
    db.commit()
    return success_response({"key": flag.key, "is_enabled": flag.is_enabled})

