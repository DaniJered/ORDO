import pytest
from datetime import datetime, timezone, timedelta
from app.db.session import SessionLocal, Base, engine
from app.models.entities import Event, Task, CommunicationDraft, Report, FeatureFlag, AutomationJob, AutomationLog
from app.automation.engine import AutomationEngine
from app.automation.jobs import check_kill_switch

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_automation_engine_job_registry(db):
    jobs = AutomationEngine.get_registered_jobs(db)
    assert len(jobs) >= 6
    job_names = [j["name"] for j in jobs]
    assert "daily_deadline_scan" in job_names
    assert "overdue_escalation" in job_names
    assert "readiness_snapshot" in job_names

def test_daily_deadline_scan_job(db):
    now = datetime.now(timezone.utc)
    event = Event(name="Automation Scan Event", start_datetime=now, end_datetime=now + timedelta(days=2))
    db.add(event)
    db.commit()

    # Task due in 12 hours
    task = Task(
        event_id=event.id,
        title="Stage Cable Delivery",
        status="in_progress",
        deadline=now + timedelta(hours=12),
        priority="high"
    )
    db.add(task)
    db.commit()

    res = AutomationEngine.run_job("daily_deadline_scan", actor="test_runner", db=db)
    assert res["status"] == "success"
    assert res["result"]["drafts_created"] >= 1

    # Verify draft exists in DB
    draft = db.query(CommunicationDraft).filter(CommunicationDraft.task_id == task.id).first()
    assert draft is not None
    assert "Deadline Notice" in draft.subject
    assert draft.approval_status == "draft"

def test_overdue_escalation_job(db):
    now = datetime.now(timezone.utc)
    event = Event(name="Overdue Escalation Event", start_datetime=now, end_datetime=now + timedelta(days=2))
    db.add(event)
    db.commit()

    # Task overdue by 5 hours
    task = Task(
        event_id=event.id,
        title="Sponsorship Cheque Collection",
        status="in_progress",
        deadline=now - timedelta(hours=5),
        priority="critical"
    )
    db.add(task)
    db.commit()

    res = AutomationEngine.run_job("overdue_escalation", actor="test_runner", db=db)
    assert res["status"] == "success"
    assert res["result"]["escalation_drafts_created"] >= 1

    # Verify escalation draft exists
    esc_draft = (
        db.query(CommunicationDraft)
        .filter(CommunicationDraft.task_id == task.id, CommunicationDraft.subject.like("%ESCALATION%"))
        .first()
    )
    assert esc_draft is not None
    assert "URGENT ESCALATION" in esc_draft.subject

def test_readiness_snapshot_job(db):
    res = AutomationEngine.run_job("readiness_snapshot", actor="test_runner", db=db)
    assert res["status"] == "success"
    assert res["result"]["events_calculated"] >= 1

    # Verify report created in DB
    latest_report = db.query(Report).filter(Report.report_type == "readiness_snapshot").order_by(Report.created_at.desc()).first()
    assert latest_report is not None
    assert latest_report.readiness_score >= 0.0

def test_global_kill_switch_enforcement(db):
    # Enable Kill Switch
    new_state = AutomationEngine.toggle_kill_switch(db, True)
    assert new_state is True
    assert check_kill_switch(db) is True

    # Attempt scheduled run with kill-switch active
    paused_res = AutomationEngine.run_job("daily_deadline_scan", actor="scheduler", db=db, trigger_type="scheduled")
    assert paused_res["status"] == "paused"
    assert "Kill-Switch" in paused_res["message"]

    # Disable Kill Switch
    off_state = AutomationEngine.toggle_kill_switch(db, False)
    assert off_state is False
    assert check_kill_switch(db) is False

