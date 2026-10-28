# ORDO Role-Based Access Control (RBAC) Permission Matrix

ORDO enforces role-based access control at the server API layer via the `require_permission` dependency.

## Roles
1. **super_admin**: Full administrative control across the system, integrations, user management, and system-wide kill-switch.
2. **coordinator**: Event coordinator who creates and manages events, teams, assigns tasks, approves evidence, and drafts communications.
3. **member**: Department team member who views assigned tasks, updates status, and uploads evidence files.
4. **approver**: Faculty / Senior Approver who reviews critical evidence, approves budgets, and validates readiness.
5. **auditor**: Read-only auditor who views tasks, evidence, approvals, automation logs, and audit trails.

---

## Permission Matrix

| Permission | Description | super_admin | coordinator | member | approver | auditor |
|---|---|:---:|:---:|:---:|:---:|:---:|
| `user:create` | Invite or create users | Yes | No | No | No | No |
| `user:read` | View user profiles & directory | Yes | Yes | Yes | Yes | Yes |
| `user:update` | Update user details & status | Yes | No | No | No | No |
| `user:delete` | Soft delete users | Yes | No | No | No | No |
| `department:manage` | Create, update, delete departments | Yes | No | No | No | No |
| `department:read` | View departments | Yes | Yes | Yes | Yes | Yes |
| `event:create` | Create new events | Yes | Yes | No | No | No |
| `event:read` | View events and details | Yes | Yes | Yes | Yes | Yes |
| `event:update` | Edit event details, team, settings | Yes | Yes | No | No | No |
| `event:delete` | Archive / soft-delete events | Yes | Yes | No | No | No |
| `task:create` | Create tasks | Yes | Yes | No | No | No |
| `task:read` | View tasks and dependencies | Yes | Yes | Yes | Yes | Yes |
| `task:update` | Update task progress, title, owner | Yes | Yes | Yes* | No | No |
| `task:delete` | Delete tasks | Yes | Yes | No | No | No |
| `evidence:upload` | Upload evidence files | Yes | Yes | Yes | No | No |
| `evidence:review` | Verify complete or reject evidence | Yes | Yes | No | Yes | No |
| `communication:draft` | Generate or edit draft messages | Yes | Yes | No | No | No |
| `communication:approve`| Approve communication for dispatch | Yes | Yes | No | Yes | No |
| `integration:manage` | Configure integrations & keys | Yes | No | No | No | No |
| `integration:test` | Trigger integration test / ping | Yes | Yes | No | No | No |
| `system:kill_switch` | Toggle emergency automation kill-switch | Yes | No | No | No | No |
| `system:feature_flags`| Toggle feature flags | Yes | No | No | No | No |
| `audit:read` | View audit logs & automation runs | Yes | Yes | No | Yes | Yes |
| `ai:query` | Ask ORDO Copilot | Yes | Yes | Yes | Yes | Yes |

*\* Members may only update tasks assigned to them or their department.*

