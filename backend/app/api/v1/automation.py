from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.entities import User
from app.automation.engine import AutomationEngine
from app.automation.jobs import check_kill_switch

router = APIRouter(prefix="/automation", tags=["automation"])

class KillSwitchToggleRequest(BaseModel):
    enabled: bool

@router.get("/jobs")
def list_automation_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = AutomationEngine.get_registered_jobs(db)
    kill_active = check_kill_switch(db)
    return {
        "success": True,
        "data": {
            "jobs": jobs,
            "kill_switch_active": kill_active,
        },
    }

@router.post("/jobs/{job_name}/run")
def run_automation_job(
    job_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    actor = f"{current_user.full_name} ({current_user.role})"
    try:
        result = AutomationEngine.run_job(job_name, actor=actor, db=db, trigger_type="manual_run")
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job execution failed: {str(e)}")

@router.get("/logs")
def get_automation_logs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = AutomationEngine.get_logs(db, limit=limit, offset=offset, status=status)
    return {"success": True, "data": logs}

@router.get("/kill-switch")
def get_kill_switch_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    active = check_kill_switch(db)
    return {"success": True, "data": {"kill_switch_active": active}}

@router.post("/kill-switch")
def toggle_kill_switch_endpoint(
    payload: KillSwitchToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["super_admin", "coordinator"]:
        raise HTTPException(status_code=403, detail="Only Admins or Coordinators can toggle the Kill-Switch.")

    new_state = AutomationEngine.toggle_kill_switch(db, payload.enabled)
    return {
        "success": True,
        "data": {
            "kill_switch_active": new_state,
            "message": f"Global Automation Kill-Switch is now {'ENABLED (PAUSED)' if new_state else 'DISABLED (ACTIVE)'}.",
        },
    }
