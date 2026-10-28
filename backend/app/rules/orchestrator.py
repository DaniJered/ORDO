from typing import Optional, Tuple, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.entities import Task, TaskDependency, EvidenceRequirement, AuditLog, EvidenceFile, Approval
from app.rules.dependency_rules import evaluate_task_blocked_state, check_circular_dependency
from app.rules.evidence_rules import can_mark_verified_complete

class RulesOrchestrator:
    @staticmethod
    def reevaluate_task(db: Session, task_id: str) -> Task:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None
            
        # Get incoming prerequisites
        incoming = db.query(TaskDependency).filter(TaskDependency.task_id == task_id).all()
        prerequisites = []
        for dep in incoming:
            prereq_task = db.query(Task).filter(Task.id == dep.depends_on_task_id).first()
            if prereq_task:
                # Update dependency satisfaction status
                dep.is_satisfied = (prereq_task.status == "verified_complete")
                prerequisites.append({
                    "id": prereq_task.id,
                    "title": prereq_task.title,
                    "status": prereq_task.status
                })
                
        is_blocked, reason = evaluate_task_blocked_state(task_id, prerequisites)
        
        old_status = task.status
        if is_blocked and task.status not in ["verified_complete", "cancelled"]:
            task.status = "blocked"
            task.blocked_reason = reason
        elif not is_blocked and task.status == "blocked":
            # Unblocked! Restore to in_progress or completed_pending_evidence
            reqs = db.query(EvidenceRequirement).filter(EvidenceRequirement.task_id == task_id).all()
            has_files = any(len(r.files) > 0 for r in reqs)
            task.status = "completed_pending_evidence" if has_files else "in_progress"
            task.blocked_reason = None
            
        if old_status != task.status:
            audit = AuditLog(
                actor_id="system_rules_engine",
                action="task_status_auto_update",
                entity_type="task",
                entity_id=task.id,
                old_value=old_status,
                new_value=task.status
            )
            db.add(audit)
            db.commit()
            db.refresh(task)
            
        return task

    @staticmethod
    def on_evidence_uploaded(db: Session, task_id: str, requirement_id: str, actor_id: str) -> Task:
        """
        §8 Rule 5: Evidence uploaded but not verified -> Completed Pending Evidence.
        """
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None

        old_status = task.status
        if task.status in ["not_started", "in_progress"]:
            task.status = "completed_pending_evidence"
            task.progress_percentage = max(task.progress_percentage, 85)
            
            audit = AuditLog(
                actor_id=actor_id,
                action="evidence_upload_status_transition",
                entity_type="task",
                entity_id=task.id,
                old_value=old_status,
                new_value=task.status
            )
            db.add(audit)
            db.commit()
            db.refresh(task)

        return task

    @staticmethod
    def on_evidence_verified(
        db: Session, 
        requirement_id: str, 
        reviewer_id: str, 
        is_approved: bool, 
        comment: Optional[str] = None
    ) -> Tuple[bool, str]:
        req = db.query(EvidenceRequirement).filter(EvidenceRequirement.id == requirement_id).first()
        if not req:
            return False, "Evidence requirement not found."
            
        task = db.query(Task).filter(Task.id == req.task_id).first()
        now = datetime.now(timezone.utc)
        
        if is_approved:
            req.verification_status = "verified"
            req.verified_by = reviewer_id
            req.verified_at = now
            req.rejection_reason = None
            
            audit = AuditLog(
                actor_id=reviewer_id,
                action="evidence_verified",
                entity_type="evidence_requirement",
                entity_id=req.id,
                old_value="pending",
                new_value="verified"
            )
            db.add(audit)
            db.commit()
            
            # Check if all mandatory evidence for this task is now verified
            can_complete, _ = RulesOrchestrator.check_can_complete(db, task.id)
            if can_complete:
                task.status = "verified_complete"
                task.progress_percentage = 100
                db.commit()
                
                # Unblock any downstream dependent tasks!
                outgoing = db.query(TaskDependency).filter(TaskDependency.depends_on_task_id == task.id).all()
                for dep in outgoing:
                    dep.is_satisfied = True
                    RulesOrchestrator.reevaluate_task(db, dep.task_id)
                    
            return True, "Evidence verified successfully."
        else:
            # Rejection (§8 Rule 6): requires mandatory reason and reopens requirement
            if not comment or not comment.strip():
                return False, "Rejection requires a mandatory reason."
                
            req.verification_status = "rejected"
            req.rejection_reason = comment
            req.verified_by = reviewer_id
            req.verified_at = now
            
            if task.status == "completed_pending_evidence":
                task.status = "in_progress"
                
            audit = AuditLog(
                actor_id=reviewer_id,
                action="evidence_rejected",
                entity_type="evidence_requirement",
                entity_id=req.id,
                old_value="pending",
                new_value=f"rejected: {comment}"
            )
            db.add(audit)
            db.commit()
            return True, "Evidence rejected and requirement reopened."

    @staticmethod
    def check_can_complete(db: Session, task_id: str) -> Tuple[bool, Optional[str]]:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return False, "Task not found"
            
        reqs = db.query(EvidenceRequirement).filter(EvidenceRequirement.task_id == task_id).all()
        evidence_dicts = [
            {"id": r.id, "name": r.name, "mandatory": r.mandatory, "verification_status": r.verification_status}
            for r in reqs
        ]
        
        deps = db.query(TaskDependency).filter(TaskDependency.task_id == task_id).all()
        dep_dicts = []
        for d in deps:
            p = db.query(Task).filter(Task.id == d.depends_on_task_id).first()
            if p:
                dep_dicts.append({"id": p.id, "title": p.title, "status": p.status})
                
        return can_mark_verified_complete(evidence_dicts, dep_dicts)
