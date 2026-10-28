import time
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.entities import AutomationJob, AutomationLog, FeatureFlag
from app.automation.jobs import (
    job_daily_deadline_scan,
    job_overdue_escalation,
    job_dependency_recheck,
    job_readiness_snapshot,
    job_integration_health_check,
    job_retention_cleanup,
    check_kill_switch,
)

logger = logging.getLogger("ordo.automation")

REGISTERED_JOBS = {
    "daily_deadline_scan": {
        "title": "Daily Deadline Monitor",
        "description": "Scans tasks with deadlines in next 24 hours and prepares notification drafts.",
        "schedule": "Daily at 08:00 UTC",
        "fn": job_daily_deadline_scan,
    },
    "overdue_escalation": {
        "title": "Overdue Task Escalator",
        "description": "Flags critical overdue tasks and drafts urgent escalation notices.",
        "schedule": "Hourly",
        "fn": job_overdue_escalation,
    },
    "dependency_recheck": {
        "title": "Workflow Dependency Re-evaluator",
        "description": "Re-evaluates DAG dependencies and auto-unblocks satisfied milestone tasks.",
        "schedule": "Every 15 minutes",
        "fn": job_dependency_recheck,
    },
    "readiness_snapshot": {
        "title": "Event Readiness & Risk Calculator",
        "description": "Computes weighted readiness scores and risks across all college events.",
        "schedule": "Daily at 00:00 UTC",
        "fn": job_readiness_snapshot,
    },
    "integration_health_check": {
        "title": "Integrations Hub Heartbeat",
        "description": "Tests connectivity and API quotas for SMTP, WhatsApp, and webhook channels.",
        "schedule": "Hourly",
        "fn": job_integration_health_check,
    },
    "retention_cleanup": {
        "title": "Audit & Retention Pruner",
        "description": "Safely prunes expired invite tokens and stale temporary cache objects.",
        "schedule": "Weekly on Sunday",
        "fn": job_retention_cleanup,
    },
}

class AutomationEngine:
    @staticmethod
    def ensure_jobs_seeded(db: Session):
        for job_key, meta in REGISTERED_JOBS.items():
            existing = db.query(AutomationJob).filter(AutomationJob.name == job_key).first()
            if not existing:
                job = AutomationJob(
                    name=job_key,
                    schedule=meta["schedule"],
                    is_active=True,
                )
                db.add(job)
        db.commit()

    @staticmethod
    def get_registered_jobs(db: Session) -> List[Dict[str, Any]]:
        AutomationEngine.ensure_jobs_seeded(db)
        db_jobs = {j.name: j for j in db.query(AutomationJob).all()}
        
        result = []
        for key, meta in REGISTERED_JOBS.items():
            record = db_jobs.get(key)
            result.append({
                "name": key,
                "title": meta["title"],
                "description": meta["description"],
                "schedule": meta["schedule"],
                "is_active": record.is_active if record else True,
                "last_run_at": record.last_run_at.isoformat() if record and record.last_run_at else None,
                "next_run_at": record.next_run_at.isoformat() if record and record.next_run_at else None,
            })
        return result

    @staticmethod
    def run_job(
        job_key: str,
        actor: str,
        db: Session,
        trigger_type: str = "manual_run",
    ) -> Dict[str, Any]:
        if job_key not in REGISTERED_JOBS:
            raise ValueError(f"Job '{job_key}' is not registered.")

        # Check Kill Switch (§10 Rule 9)
        kill_active = check_kill_switch(db)
        if kill_active and trigger_type != "manual_run":
            log = AutomationLog(
                job_name=job_key,
                trigger_time=datetime.now(timezone.utc),
                result=json.dumps({"paused": True, "reason": "Global Kill-Switch Active"}),
                status="paused",
                actor=actor,
            )
            db.add(log)
            db.commit()
            return {"status": "paused", "message": "Automation paused by Global Kill-Switch."}

        job_meta = REGISTERED_JOBS[job_key]
        start_time = time.time()
        now = datetime.now(timezone.utc)

        status = "success"
        err_msg = None
        result_data = {}

        try:
            result_data = job_meta["fn"](db, actor=actor)
        except Exception as e:
            status = "failure"
            err_msg = str(e)
            result_data = {"error": err_msg}
            logger.error(f"Automation job {job_key} failed: {e}", exc_info=True)

        duration_ms = int((time.time() - start_time) * 1000)

        # Record in automation_logs
        log = AutomationLog(
            job_name=job_key,
            trigger_time=now,
            input_data=json.dumps({"trigger": trigger_type, "actor": actor}),
            result=json.dumps(result_data),
            status=status,
            error_message=err_msg,
            actor=actor,
        )
        db.add(log)

        # Update automation_jobs record
        job_record = db.query(AutomationJob).filter(AutomationJob.name == job_key).first()
        if job_record:
            job_record.last_run_at = now
            # Next estimated run
            job_record.next_run_at = now + timedelta(hours=24 if "Daily" in job_meta["schedule"] else 1)

        db.commit()

        return {
            "job_name": job_key,
            "status": status,
            "duration_ms": duration_ms,
            "result": result_data,
            "error": err_msg,
        }

    @staticmethod
    def get_logs(
        db: Session,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = db.query(AutomationLog).order_by(AutomationLog.created_at.desc())
        if status:
            query = query.filter(AutomationLog.status == status)

        logs = query.offset(offset).limit(limit).all()
        return [
            {
                "id": l.id,
                "job_name": l.job_name,
                "trigger_time": l.trigger_time.isoformat() if l.trigger_time else None,
                "status": l.status,
                "result": l.result,
                "error_message": l.error_message,
                "actor": l.actor,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ]

    @staticmethod
    def toggle_kill_switch(db: Session, enable: bool) -> bool:
        flag = db.query(FeatureFlag).filter(FeatureFlag.key == "kill_switch_active").first()
        if not flag:
            flag = FeatureFlag(
                key="kill_switch_active",
                name="Global Automation Kill-Switch",
                description="Immediately pauses all outbound background automation and notifications.",
                is_enabled=enable,
            )
            db.add(flag)
        else:
            flag.is_enabled = enable

        db.commit()
        return flag.is_enabled

