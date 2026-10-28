import pytest
from app.rules.dependency_rules import check_circular_dependency, evaluate_task_blocked_state
from app.rules.evidence_rules import can_mark_verified_complete

def test_circular_dependency_self():
    assert check_circular_dependency("T1", "T1", []) is True

def test_circular_dependency_two_nodes():
    # T1 depends on T2 exists (edge T2 -> T1). Now trying to make T2 depend on T1 (edge T1 -> T2).
    existing = [("T1", "T2")]
    assert check_circular_dependency("T2", "T1", existing) is True

def test_circular_dependency_chain():
    # T1 -> T2 -> T3
    existing = [("T1", "T2"), ("T2", "T3")]
    # Attempt T3 -> T1 => Cycle!
    assert check_circular_dependency("T3", "T1", existing) is True
    # Attempt T3 -> T4 (valid)
    assert check_circular_dependency("T3", "T4", existing) is False

def test_task_blocked_state():
    # If prerequisite is incomplete, task is blocked
    prereqs = [{"id": "P1", "title": "Prereq 1", "status": "in_progress"}]
    is_blocked, reason = evaluate_task_blocked_state("T1", prereqs)
    assert is_blocked is True
    assert "Prereq 1" in reason

    # If all prerequisites are verified complete, task is not blocked
    prereqs_complete = [{"id": "P1", "title": "Prereq 1", "status": "verified_complete"}]
    is_blocked_done, reason_done = evaluate_task_blocked_state("T1", prereqs_complete)
    assert is_blocked_done is False
    assert reason_done is None

def test_cannot_mark_verified_complete_missing_evidence():
    evidence = [{"id": "E1", "name": "Dean Letter", "mandatory": True, "verification_status": "pending"}]
    deps = [{"id": "D1", "title": "Prior Task", "status": "verified_complete"}]
    can_complete, reason = can_mark_verified_complete(evidence, deps)
    assert can_complete is False
    assert "Dean Letter" in reason

def test_cannot_mark_verified_complete_unsatisfied_dependencies():
    evidence = [{"id": "E1", "name": "Dean Letter", "mandatory": True, "verification_status": "verified"}]
    deps = [{"id": "D1", "title": "Stage Rigging", "status": "blocked"}]
    can_complete, reason = can_mark_verified_complete(evidence, deps)
    assert can_complete is False
    assert "Stage Rigging" in reason

def test_can_mark_verified_complete_success():
    evidence = [{"id": "E1", "name": "Dean Letter", "mandatory": True, "verification_status": "verified"}]
    deps = [{"id": "D1", "title": "Stage Rigging", "status": "verified_complete"}]
    can_complete, reason = can_mark_verified_complete(evidence, deps)
    assert can_complete is True
    assert reason is None

