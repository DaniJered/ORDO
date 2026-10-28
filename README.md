# ORDO — AI-Powered Workflow Dependency & Evidence Verification System

> **ORDO** is an intelligent workflow coordination and tamper-evident evidence verification platform tailored for college event management.
> **Core Architecture:** AI assists, summarizes, and drafts. Authorized humans retain strict sign-off authority. A deterministic rules orchestrator—not probabilistic AI—governs all workflow states, dependency cascades, and evidence requirements.

---

## 🚀 Quick Setup (Under 10 Minutes)

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 1. Backend Setup
```bash
# In repository root
pip install -r backend/requirements.txt

# Run database setup & populate seed data
run_backend.bat
# Or manually:
# set PYTHONPATH=backend
# python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend
```
- API Docs & Swagger UI: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Frontend Setup
```bash
# In repository root
run_frontend.bat
# Or manually:
# cd frontend
# npm run dev
```
- Web Application: `http://localhost:3000`
- Component Showcase: `http://localhost:3000/dev/components`

---

## 👥 Demo Seed Accounts (Password: `Password123!`)

The seed script pre-populates a rich college event dataset ("Tech Fest 2026") across 4 departments with accounts covering all 5 user roles:

| Role | Email | Responsibilities |
|---|---|---|
| **Super Admin** | `admin@ordo.college` | System settings, user invites, kill-switch, audit logs |
| **Event Coordinator** | `rahul.coord@ordo.college` | Create events, assign tasks, draft communications |
| **Logistics Coordinator**| `sneha.coord@ordo.college` | Coordinate venue, permissions, catering |
| **Department Member** | `priya.mkt@ordo.college` | Complete tasks, upload required evidence files |
| **Faculty Approver** | `prof.mehta@ordo.college` | Approve critical evidence, budgets, final event readiness |
| **Auditor** | `auditor@ordo.college` | Read-only inspection of tasks, evidence, logs, and audit trail |

*(Quick 1-click role login pills are provided directly on the Login screen for instant testing).*

---

## 🧪 Automated Test Suite (34/34 Passing)

Run the full automated test suite covering permissions, circular dependency detection, evidence gates, document parsing, AI tone rewriting, automation jobs, kill-switch, and readiness score calculations:

```bash
run_tests.bat
# Or:
# python -m pytest backend/tests -v
```

```
============================= 34 passed in 2.69s ==============================
```

---

## 📐 System Modules & Capabilities

### 1. Deterministic Workflow & DAG Engine (`/events/[id]`, `/tasks`)
- **Interactive SVG DAG Map:** Visual dependency graph with column auto-depth, zoom/pan controls, green satisfied edges, and red pulsing blocked edges.
- **Cycle Detection:** DFS cycle detector blocks circular prerequisites (`A -> B -> A` or self-dependencies).
- **Auto-Unblocking Cascade (§8 Rules 2 & 3):** When an approver verifies a prerequisite task's evidence, the dependency is marked satisfied and downstream blocked tasks automatically unlock.
- **Evidence State Cascade (§8 Rule 5):** Uploading evidence automatically advances task to `completed_pending_evidence`.
- **Mandatory Rejection Explanation (§8 Rule 6):** Approvers cannot reject evidence without supplying an explanation, ensuring accountability.

### 2. AI Layer & Extraction Studio (`/ai-review`, `/communications`)
- **Multi-Format Document Parser:** Extracts raw text from PDF (via `pypdf`), Plain Text, and Markdown, cached by SHA-256 hash.
- **Commitment Extraction:** Parses unstructured meeting minutes or permission letters into suggested tasks with suggested owners, deadlines, dependencies, and evidence requirements.
- **Human-in-the-Loop Workbench:** Review suggested commitments side-by-side with source text; 1-click "Accept & Convert to Task" directly provisions the task into the event workflow.
- **Communications Studio:** Draft outbound emails and WhatsApp alerts. Tone rewriting toolbar adjusts messages to "Shorter", "Firmer" (escalation), or "Friendlier".
- **Safety Gate:** Messages cannot be dispatched without coordinator approval and verified recipient WhatsApp opt-in.

### 3. Automation Engine (`/automation`)
- **Deterministic Scheduled Workers:**
  1. `daily_deadline_scan`: Detects milestones due in <24h and prepares reminder drafts.
  2. `overdue_escalation`: Generates urgent escalation drafts for overdue milestones.
  3. `dependency_recheck`: Re-evaluates all graph dependencies and unblocks satisfied tasks.
  4. `readiness_snapshot`: Computes daily readiness snapshots.
  5. `integration_health_check`: Verifies SMTP and WhatsApp connection health.
  6. `retention_cleanup`: Prunes expired tokens and temporary caches.
- **Manual "Run Now" Triggers:** Coordinators can trigger any job on-demand with live millisecond timing for demos.
- **Global Emergency Kill-Switch (§10 Rule 9):** One-click system freeze pausing all outbound dispatches with prominent topbar alert.

### 4. Executive Reports & Readiness Score (`/reports`, `/dashboard`)
- **Mathematical Readiness Score:** Multi-factor formula combining 40% task verification, 35% evidence completeness, and 25% unblocked graph health, with overdue milestone penalties.
- **Departmental Risk Modeling:** Risk matrices for Technical, Logistics, Marketing, and Finance departments.
- **Streaming CSV Export:** Generates clean CSV data export of all workflows, assignees, deadlines, and verification statuses.

---

## 📁 Repository Structure
```
ORDO/
├── backend/
│   ├── app/
│   │   ├── ai/            # Prompts, providers (Mock, Gemini), schemas, AIService
│   │   ├── api/v1/        # REST endpoints (auth, events, tasks, evidence, ai, automation, reports)
│   │   ├── automation/    # Background jobs runner, registry, and execution logs
│   │   ├── core/          # Config, security, permissions, responses
│   │   ├── db/            # SQLAlchemy session and Base
│   │   ├── integrations/  # SMTP, WhatsApp, Gmail adapters & registry
│   │   ├── models/        # All 31 tables defined
│   │   ├── rules/         # Dependency rules, evidence gates, orchestrator
│   │   ├── schemas/       # Pydantic input/output validation models
│   │   └── services/      # Document parser, storage backend, seed data
│   └── tests/             # Pytest automated test suite (34 tests)
├── frontend/
│   ├── src/
│   │   ├── app/           # App router pages (dashboard, tasks, ai-review, communications, automation, reports, etc.)
│   │   ├── components/    # Shared primitives, DAG graph, modal drawers
│   │   ├── lib/           # API and auth helpers
│   │   └── styles/        # Design tokens and Tailwind globals
├── docs/
│   ├── DECISIONS.md       # Architecture decision records (ADRs)
│   ├── PERMISSIONS.md     # Server-enforced RBAC matrix
│   ├── READINESS_SCORE.md # Deterministic readiness formula
│   └── ROADMAP.md         # Phased progression and extension points
├── infra/
│   └── docker-compose.yml # Container definitions (Postgres, Redis, Mailpit)
├── run_backend.bat        # Convenience backend launcher
├── run_frontend.bat       # Convenience frontend launcher
├── run_tests.bat          # Convenience test runner
└── AGENT.md               # Master product specification
```
