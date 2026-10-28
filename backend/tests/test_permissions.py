import pytest
from app.core.permissions import has_permission, Role, PERMISSION_MATRIX

def test_super_admin_has_all_permissions():
    for permission in PERMISSION_MATRIX:
        assert has_permission(Role.SUPER_ADMIN, permission) is True

def test_coordinator_permissions():
    assert has_permission(Role.COORDINATOR, "event:create") is True
    assert has_permission(Role.COORDINATOR, "task:create") is True
    assert has_permission(Role.COORDINATOR, "communication:draft") is True
    # Should not manage system settings
    assert has_permission(Role.COORDINATOR, "system:kill_switch") is False
    assert has_permission(Role.COORDINATOR, "integration:manage") is False

def test_member_permissions():
    assert has_permission(Role.MEMBER, "task:read") is True
    assert has_permission(Role.MEMBER, "evidence:upload") is True
    # Cannot create events or manage departments
    assert has_permission(Role.MEMBER, "event:create") is False
    assert has_permission(Role.MEMBER, "department:manage") is False

def test_approver_permissions():
    assert has_permission(Role.APPROVER, "evidence:review") is True
    assert has_permission(Role.APPROVER, "communication:approve") is True
    # Cannot delete events
    assert has_permission(Role.APPROVER, "event:delete") is False

def test_auditor_permissions():
    assert has_permission(Role.AUDITOR, "audit:read") is True
    assert has_permission(Role.AUDITOR, "task:read") is True
    # Read-only: cannot mutate
    assert has_permission(Role.AUDITOR, "task:create") is False
    assert has_permission(Role.AUDITOR, "task:update") is False
    assert has_permission(Role.AUDITOR, "evidence:upload") is False

