from enum import Enum
from typing import Dict, Set

class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    COORDINATOR = "coordinator"
    MEMBER = "member"
    APPROVER = "approver"
    AUDITOR = "auditor"

# Permission definitions mapped to allowed roles
PERMISSION_MATRIX: Dict[str, Set[str]] = {
    # User management
    "user:create": {Role.SUPER_ADMIN},
    "user:read": {Role.SUPER_ADMIN, Role.COORDINATOR, Role.MEMBER, Role.APPROVER, Role.AUDITOR},
    "user:update": {Role.SUPER_ADMIN},
    "user:delete": {Role.SUPER_ADMIN},
    
    # Department management
    "department:manage": {Role.SUPER_ADMIN},
    "department:read": {Role.SUPER_ADMIN, Role.COORDINATOR, Role.MEMBER, Role.APPROVER, Role.AUDITOR},
    
    # Event management
    "event:create": {Role.SUPER_ADMIN, Role.COORDINATOR},
    "event:read": {Role.SUPER_ADMIN, Role.COORDINATOR, Role.MEMBER, Role.APPROVER, Role.AUDITOR},
    "event:update": {Role.SUPER_ADMIN, Role.COORDINATOR},
    "event:delete": {Role.SUPER_ADMIN, Role.COORDINATOR},
    
    # Task management
    "task:create": {Role.SUPER_ADMIN, Role.COORDINATOR},
    "task:read": {Role.SUPER_ADMIN, Role.COORDINATOR, Role.MEMBER, Role.APPROVER, Role.AUDITOR},
    "task:update": {Role.SUPER_ADMIN, Role.COORDINATOR, Role.MEMBER},
    "task:delete": {Role.SUPER_ADMIN, Role.COORDINATOR},
    
    # Evidence & Approvals
    "evidence:upload": {Role.SUPER_ADMIN, Role.COORDINATOR, Role.MEMBER},
    "evidence:review": {Role.SUPER_ADMIN, Role.COORDINATOR, Role.APPROVER},
    
    # Communication
    "communication:draft": {Role.SUPER_ADMIN, Role.COORDINATOR},
    "communication:approve": {Role.SUPER_ADMIN, Role.COORDINATOR, Role.APPROVER},
    
    # Integrations & System
    "integration:manage": {Role.SUPER_ADMIN},
    "integration:test": {Role.SUPER_ADMIN, Role.COORDINATOR},
    "system:kill_switch": {Role.SUPER_ADMIN},
    "system:feature_flags": {Role.SUPER_ADMIN},
    
    # Audit & Reporting
    "audit:read": {Role.SUPER_ADMIN, Role.COORDINATOR, Role.APPROVER, Role.AUDITOR},
    
    # AI
    "ai:query": {Role.SUPER_ADMIN, Role.COORDINATOR, Role.MEMBER, Role.APPROVER, Role.AUDITOR},
}

def has_permission(role: str, permission: str) -> bool:
    """Verifies whether a given role holds the requested permission."""
    allowed_roles = PERMISSION_MATRIX.get(permission, set())
    return role in allowed_roles

