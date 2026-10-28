import os
import pytest
from datetime import datetime, timezone, timedelta
from app.db.session import SessionLocal, Base, engine
from app.models.entities import Task, TaskDependency, EvidenceRequirement, User, Department, Event
from app.rules.orchestrator import RulesOrchestrator
from app.services.storage import LocalStorageBackend
from app.core.security import hash_password

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def test_local_storage_backend(tmp_path):
    storage = LocalStorageBackend(base_dir=str(tmp_path))
    data = b"Sample college permission letter content for symposium."
    path, sha, size = storage.save_file(data, "PermissionLetter.pdf")
    
    assert os.path.exists(path)
    assert size == len(data)
    assert len(sha) == 64 # SHA-256 hex length
    assert storage.get_file(path) == data

def test_evidence_upload_status_cascade(db_session):
    now = datetime.now(timezone.utc)
    # Create test event & task
    event = Event(name="P2 Test Event", start_datetime=now, end_datetime=now + timedelta(days=2))
    db_session.add(event)
    db_session.commit()
    
    task = Task(
        event_id=event.id,
        title="Stage Rigging Test",
        deadline=now + timedelta(days=1),
        status="in_progress",
        evidence_required=True
    )
    db_session.add(task)
    db_session.commit()

    req = EvidenceRequirement(task_id=task.id, name="Signed Venue Permission", mandatory=True)
    db_session.add(req)
    db_session.commit()

    # When evidence is uploaded, status moves to completed_pending_evidence (§8 Rule 5)
    updated_task = RulesOrchestrator.on_evidence_uploaded(db_session, task.id, req.id, "test-user")
    assert updated_task.status == "completed_pending_evidence"
    assert updated_task.progress_percentage >= 85

def test_evidence_rejection_reopens_requirement(db_session):
    now = datetime.now(timezone.utc)
    task = Task(event_id="dummy", title="Catering Quotations", deadline=now, status="completed_pending_evidence")
    db_session.add(task)
    db_session.commit()

    req = EvidenceRequirement(task_id=task.id, name="3 Vendor Quotes", mandatory=True)
    db_session.add(req)
    db_session.commit()

    # Rejection without reason must fail
    success, err = RulesOrchestrator.on_evidence_verified(db_session, req.id, "approver-1", False, "")
    assert success is False
    assert "mandatory reason" in err

    # Rejection with reason succeeds and reopens requirement (§8 Rule 6)
    success, msg = RulesOrchestrator.on_evidence_verified(
        db_session, req.id, "approver-1", False, "Missing vendor #3 official stamp."
    )
    assert success is True
    db_session.refresh(req)
    assert req.verification_status == "rejected"
    assert "Missing vendor #3" in req.rejection_reason

def test_cascade_prerequisite_verified_unblocks_dependent_task(db_session):
    now = datetime.now(timezone.utc)
    event = Event(name="Cascade Fest", start_datetime=now, end_datetime=now + timedelta(days=2))
    db_session.add(event)
    db_session.commit()

    # Task A: Prerequisite
    task_a = Task(event_id=event.id, title="Venue Hall Booking", deadline=now + timedelta(days=1), status="in_progress")
    # Task B: Dependent on A (starts blocked)
    task_b = Task(event_id=event.id, title="Sound System Setup", deadline=now + timedelta(days=2), status="blocked")
    db_session.add_all([task_a, task_b])
    db_session.commit()

    # Create dependency: B depends on A
    dep = TaskDependency(task_id=task_b.id, depends_on_task_id=task_a.id, is_satisfied=False)
    db_session.add(dep)
    
    req_a = EvidenceRequirement(task_id=task_a.id, name="Hall Booking Receipt", mandatory=True, verification_status="pending")
    db_session.add(req_a)
    db_session.commit()

    # Task B is initially blocked
    RulesOrchestrator.reevaluate_task(db_session, task_b.id)
    db_session.refresh(task_b)
    assert task_b.status == "blocked"

    # Approver verifies Task A's evidence
    success, _ = RulesOrchestrator.on_evidence_verified(db_session, req_a.id, "approver-1", True)
    assert success is True

    # Check Task A is now verified complete
    db_session.refresh(task_a)
    assert task_a.status == "verified_complete"

    # Check Task B was automatically unblocked by cascade!
    db_session.refresh(task_b)
    assert task_b.status == "in_progress"
    assert task_b.blocked_reason is None

