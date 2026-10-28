import uuid
import pytest
from datetime import datetime, timezone, timedelta
from app.db.session import SessionLocal, Base, engine
from app.models.entities import Event, Task, EvidenceRequirement, Department
from app.api.v1.reports import get_event_readiness, get_department_risks, export_event_csv

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

class DummyUser:
    email = "admin@ordo.college"
    role = "super_admin"

def test_readiness_score_calculation(db):
    now = datetime.now(timezone.utc)
    uid = uuid.uuid4().hex[:6]
    event = Event(name=f"Readiness Event {uid}", start_datetime=now, end_datetime=now + timedelta(days=3))
    db.add(event)
    db.commit()

    # 1 verified task, 1 in progress task, 1 blocked task
    t1 = Task(event_id=event.id, title=f"Task 1 {uid}", deadline=now + timedelta(days=1), status="verified_complete", progress_percentage=100)
    t2 = Task(event_id=event.id, title=f"Task 2 {uid}", deadline=now + timedelta(days=2), status="in_progress", progress_percentage=50)
    t3 = Task(event_id=event.id, title=f"Task 3 {uid}", deadline=now + timedelta(days=2), status="blocked", blocked_reason="Waiting on Task 2")
    db.add_all([t1, t2, t3])
    db.commit()

    res = get_event_readiness(event.id, db, DummyUser())
    assert res["success"] is True
    data = res["data"]
    assert data["summary"]["total_tasks"] == 3
    assert data["summary"]["completed_tasks"] == 1
    assert data["summary"]["blocked_tasks"] == 1
    assert data["readiness_score"] > 0.0
    assert data["risk_level"] in ["Low", "Medium", "High"]
    assert len(data["top_risks"]) >= 1

def test_department_risks_breakdown(db):
    now = datetime.now(timezone.utc)
    uid = uuid.uuid4().hex[:6]
    event = Event(name=f"Dept Risk Event {uid}", start_datetime=now, end_datetime=now + timedelta(days=2))
    dept = Department(name=f"Logistics Dept {uid}", color_tag="purple")
    db.add_all([event, dept])
    db.commit()

    t = Task(event_id=event.id, department_id=dept.id, deadline=now + timedelta(days=1), title="Transport arrangement", status="blocked")
    db.add(t)
    db.commit()

    res = get_department_risks(event.id, db, DummyUser())
    assert res["success"] is True
    assert len(res["data"]) >= 1
    dept_item = next((d for d in res["data"] if d["department_id"] == dept.id), None)
    assert dept_item is not None
    assert dept_item["blocked_tasks"] == 1

def test_csv_export_endpoint(db):
    now = datetime.now(timezone.utc)
    uid = uuid.uuid4().hex[:6]
    event = Event(name=f"CSV Test Event {uid}", start_datetime=now, end_datetime=now + timedelta(days=1))
    db.add(event)
    db.commit()

    t = Task(event_id=event.id, deadline=now + timedelta(hours=10), title="Flyer distribution", status="todo")
    db.add(t)
    db.commit()

    response = export_event_csv(event.id, db, DummyUser())
    assert response.status_code == 200
    assert response.media_type == "text/csv"
    assert "attachment; filename=" in response.headers["content-disposition"]
