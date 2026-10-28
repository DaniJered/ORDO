# AGENT.md — ORDO Master Prompt (for Google Antigravity)

> Place this file at the repository root as `AGENT.md` (Antigravity also reads `AGENTS.md`; keep a copy or symlink under that name if your workspace expects it). Every agent in this workspace must read this file before doing anything.

---

## 0. HOW YOU MUST WORK (Antigravity operating protocol)

You are a team of cooperating agents acting as: **senior full-stack AI engineer, product designer (UI/UX), QA engineer, and technical architect.**

1. **Plan before code.** For every phase, first produce an **Implementation Plan artifact** (scope, file tree, data model changes, API list, risks). Wait for my approval of the plan only at phase boundaries, not at every step.
2. **Keep a Task List artifact** and tick items off as you go.
3. **Verify, don't assume.** After each phase, run the app, run the tests, and use the **browser agent** to click through the key flows. Attach a **Walkthrough artifact** with screenshots/recordings of what you verified.
4. **Parallelize safely.** If you spawn sub-agents, split by boundary (backend / frontend / infra / tests). Never let two agents edit the same file. Shared contracts (OpenAPI schema, TypeScript types) are the source of truth.
5. **Be honest.** Never fake an integration. If something needs credentials, build it behind an adapter with a **mock mode** and say clearly what is real and what is mocked.
6. **Ask only essential questions.** If something is ambiguous, pick a sensible default, record it in `docs/DECISIONS.md`, and continue. Ask me only if a wrong guess would cause large rework.
7. **Stop at phase boundaries.** Do not start the next phase until I review the current one.
8. **Commit style.** Small, meaningful commits (`feat(tasks): add dependency blocking rule`).

---

## 1. PRODUCT

**ORDO — AI-Powered Workflow Dependency and Evidence Verification System using RPA**

ORDO helps college event teams coordinate tasks, track commitments, verify evidence, detect blocked work, and automate follow-ups.

**Core principle:** AI drafts and suggests. Authorized humans approve anything important. The deterministic rules engine, not the AI, decides workflow state.

### 1.1 What a coordinator must be able to do

1. Create and manage events (full lifecycle, see §6.1).
2. Add and manage people, departments, roles, and event teams (see §6.2).
3. Connect external apps — email, WhatsApp, calendar, storage, chat (see §7).
4. Create tasks with owners, deadlines, priorities, dependencies, and required evidence.
5. Upload emails, minutes, PDFs, DOCX, images, and pasted text. AI extracts commitments; a human reviews them before they become tasks.
6. Track status: `Not Started`, `In Progress`, `Blocked`, `Completed Pending Evidence`, `Verified Complete`, `Cancelled`.
7. Detect missing evidence, overdue tasks, dependency violations, and readiness risks automatically.
8. Review, edit, approve, or reject AI-drafted emails and WhatsApp messages.
9. See a live event-readiness dashboard and a full audit trail.
10. Ask the **ORDO Copilot** questions about the event in natural language (see §5.5).

---

## 2. TECH STACK

| Layer | Choice |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide icons, TanStack Query, Zustand (light UI state), React Hook Form + Zod, Recharts, React Flow (dependency graph), `cmdk` (command palette), `next-themes` (dark/light) |
| Backend | Python FastAPI, Pydantic v2, SQLAlchemy 2 + Alembic |
| Database | PostgreSQL |
| Auth | JWT (access + refresh), password hashing (argon2/bcrypt), RBAC |
| Files | Local storage in dev behind a `StorageBackend` interface (S3 / GCS adapters stubbed) |
| Jobs | Celery + Redis, Celery Beat for schedules |
| AI | Provider-agnostic `LLMProvider` interface: OpenAI-compatible APIs + Google Gemini + a deterministic **mock provider** (default) |
| Email | SMTP (dev, e.g. Mailpit container) — Gmail API as an optional, separate adapter |
| WhatsApp | WhatsApp Cloud API adapter — **mock mode by default** |
| Realtime | Server-Sent Events (SSE) for live dashboard/notification updates (WebSocket optional later) |
| Testing | Pytest, Vitest, Playwright |
| Deploy | Docker Compose (dev) |

No browser-based RPA is claimed. "RPA" here means scheduled, rule-driven background automation.

---

## 3. USER ROLES

| Role | Capabilities |
|---|---|
| **Super Admin** | Manage users, departments, system settings, integrations, kill-switch, audit logs |
| **Event Coordinator** | Create events, manage event teams, assign tasks, approve evidence and communications, view dashboards, manage event-level integrations |
| **Department Member** | View assigned tasks, upload evidence, update status, respond to follow-ups |
| **Approver / Faculty Coordinator** | Approve critical evidence, budgets, permissions, final event readiness |
| **Auditor** | Read-only: tasks, evidence, approvals, automation logs, audit history |

Enforce permissions **on the server for every endpoint** via a central dependency (`require_permission("task:update")`). Hide UI the user can't use, but never rely on the UI for security. Define a permission matrix in `docs/PERMISSIONS.md` and generate tests from it.

---

## 4. DATA MODEL

Create PostgreSQL models (with indexes on all foreign keys, `status`, `deadline`, `event_id`, `owner_id`) for at least:

`users`, `departments`, `events`, `event_participants`, `tasks`, `task_assignments`, `task_dependencies`, `evidence_requirements`, `evidence_files`, `evidence_reviews`, `commitments`, `extracted_commitments`, `approvals`, `notifications`, `message_templates`, `communication_drafts`, `automation_jobs`, `automation_logs`, `audit_logs`, `integration_settings`, `reports`

**Additional tables (new):**

- `invitations` — email invite, role, event/department scope, token hash, expires_at, accepted_at, invited_by
- `contacts` — external people (vendors, sponsors, guests) with name, email, phone, org, notes, tags
- `contact_channels` — per-person channel preferences and **opt-in records** (channel, opted_in_at, source, revoked_at)
- `event_templates` — reusable event blueprints (tasks, dependencies, evidence requirements)
- `integration_connections` — provider, scope (global/event), status, encrypted credentials ref, last_checked_at, last_error
- `webhook_events` — inbound webhook payloads (WhatsApp status, email bounces) with processing status
- `comments` — threaded comments on tasks/evidence with @mentions
- `attachments_text_cache` — extracted text per uploaded document (for AI + search)
- `ai_runs` — every LLM call: purpose, provider, model, prompt version, input hash, output JSON, tokens, latency, cost estimate, success/failure
- `feature_flags` — key, enabled, scope (supports gradual rollout and "coming soon" modules)

**Key fields**

- **Task:** id, event_id, title, description, department_id, owner_id, deadline, priority, status, progress_percentage, evidence_required, blocked_reason, created_by, created_at, updated_at
- **TaskDependency:** task_id, depends_on_task_id, dependency_type (`finish_to_start` | `approval_required` | `evidence_required`), is_satisfied, checked_at
- **EvidenceRequirement:** task_id, name, description, file_types_allowed, mandatory, verification_status, verified_by, verified_at
- **AuditLog:** actor_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, timestamp
- **Event (extended):** name, description, type, start/end datetime, venue, expected_attendance, budget_estimate, status (`draft | planning | active | completed | archived`), cover_image, created_by, template_id (nullable)

Use soft-delete (`deleted_at`) for users, events, tasks, contacts. Apply data-retention settings in a scheduled cleanup job.

---

## 5. AI INTEGRATION

### 5.0 AI architecture rules

- All AI goes through one **`AIService`** that calls an `LLMProvider` (`openai_compatible`, `gemini`, `mock`).
- Every prompt lives in `backend/app/ai/prompts/` as a **versioned file** (`commitment_extraction.v1.md`), never inline.
- Every AI response is **structured JSON validated by Pydantic**. On invalid JSON: one repair retry, then fail gracefully with a logged `ai_runs` row and a clear UI message.
- Store the **original AI output** and the **human-edited version** separately.
- Every AI suggestion in the UI carries an **"AI" badge, a confidence indicator, and a "why" popover** (rationale). Humans can accept, edit, or reject in one click.
- Rate-limit AI endpoints. Redact obvious secrets/PII patterns before sending text to external providers where feasible; document what is sent.
- Mock provider returns realistic fixed outputs so the whole app is demoable offline.

### 5.A Commitment extraction
Input: email, minutes, PDF, DOCX, image (OCR hook), pasted text. Output per commitment: `commitment_text, task_title, task_description, responsible_department, responsible_person_if_identified, deadline, priority, evidence_required, dependencies, confidence_score, source_document_reference, extraction_rationale`.
Never auto-create tasks. Send to **Review screen**: accept, edit, reject, merge duplicates, or convert to task (bulk actions supported). Highlight the source passage next to each commitment.

### 5.B Evidence classification
Identify document type (permission letter, budget approval, invoice, quotation, sponsor letter, venue confirmation, design file, approval email, …), extract key fields, compare to the evidence requirement, return `likely_match, confidence_score, missing_information, recommended_action, explanation`. **Only an authorized human can mark evidence Verified Complete.**

### 5.C Communication drafting
Drafts for: task reminder, overdue escalation, missing-evidence request, dependency-blocked notice, approval request, event-readiness summary. Each draft has recipient, subject, body (professional and concise), referenced task + deadline, evidence request (if any), channel (`email` | `whatsapp`), and `approval_status` (`draft | approved | rejected | sent`). Allow tone adjustment buttons ("shorter", "firmer", "friendlier") that re-run the draft. No external send without approval unless auto-send is enabled for low-risk reminders.

### 5.D Event-readiness assessment
Overall score, completed/pending/blocked/overdue tasks, missing evidence, critical dependency risks, departments needing follow-up, recommended next actions, and an **evidence-based explanation** of the score. The **score itself is computed deterministically**; AI only writes the narrative.

### 5.5 NEW — AI features for a better workflow

Build these as separate, flag-gated modules so they can be improved later:

1. **ORDO Copilot** (side panel, `Ctrl/Cmd+J`): natural-language Q&A over the current event — *"What's blocking the sound system?"*, *"Which departments have overdue tasks?"*. Answers must cite tasks/evidence (clickable links). Copilot is **read-only by default**; any action it proposes (create task, draft reminder) appears as a confirmable suggestion card.
2. **Smart task builder:** describe an event in plain language → AI proposes a task list with dependencies and evidence requirements → review screen → create. Also works from an `event_template`.
3. **Dependency suggestions:** AI proposes likely missing dependencies between tasks (always shown as suggestions, never auto-applied).
4. **Risk radar:** daily AI-written summary of top risks per event, grounded in rule-engine facts (overdue, blocked, missing evidence, deadline proximity).
5. **Meeting-minutes → follow-ups:** one-click flow from an uploaded minutes file to extracted commitments to drafted reminders.
6. **Duplicate and conflict detection:** warn when a new task/commitment resembles an existing one, or when owner/deadline conflicts exist.
7. **Semantic search** (extension point): global search first uses keyword/Postgres full-text; leave a `VectorIndex` interface (pgvector) stubbed for later.
8. **AI usage & cost panel** in Admin → shows `ai_runs` stats, failures, latency, estimated cost per provider.

---

## 6. CORE PORTAL MODULES

### 6.1 Events (create, manage, reuse)
- **Create event wizard** (4 steps): Basics → Team & Departments → Starter tasks (blank / from template / AI-suggested) → Review.
- Event list with grid/table toggle, search, filters (status, date, department), and quick actions.
- Event detail tabs: **Overview, Tasks, Dependency Map, Evidence, People, Communications, Reports, Settings**.
- Duplicate event, save as template, archive, restore.
- Event-level settings: reminder intervals, escalation delay, auto-send for low-risk reminders (off by default), event-specific integration overrides.

### 6.2 People & access
- **Users:** Admin can add users directly or **invite by email** (token link, expiry, role pre-assigned). Bulk invite via CSV upload with validation preview.
- **Departments:** CRUD, head of department, members, color tag.
- **Event team:** add existing users to an event with an event-level role; remove/replace with task reassignment prompt.
- **Contacts (external people):** vendors, sponsors, chief guests. Store channel preferences and **opt-in status per channel** (required before WhatsApp).
- **Profile & preferences:** name, phone, avatar, notification channels, quiet hours, theme.
- Deactivating a user must prompt to reassign their open tasks.

### 6.3 Tasks, evidence, approvals
Kanban board + table view + calendar view, filters (department, owner, priority, status, overdue, blocked, missing evidence), saved views, bulk actions, comments with @mentions, activity timeline, and a visual **dependency graph** (React Flow) with blocked paths highlighted.

### 6.4 Notifications center
In-app bell with unread count, grouped by event; per-user channel preferences; digest option (daily summary) as an extension point.

### 6.5 Search & command palette
`Ctrl/Cmd+K` palette: jump to events/tasks/people, create task/event, switch theme, open Copilot. Global search covers events, tasks, people, evidence names, and commitments.

---

## 7. INTEGRATIONS HUB (NEW — build the framework, ship what's feasible)

Create **Settings → Integrations** (global) and **Event → Settings → Integrations** (overrides). Each integration is a plug-in implementing a common interface:

```python
class IntegrationAdapter(Protocol):
    key: str                      # "smtp", "gmail", "whatsapp_cloud", ...
    category: str                 # "email" | "messaging" | "calendar" | "storage" | "chat" | "ai"
    config_schema: type[BaseModel]
    async def validate_config(self, config) -> HealthResult: ...
    async def send(self, message) -> SendResult: ...        # if applicable
    async def handle_webhook(self, payload, headers) -> None: ...  # if applicable
    async def health_check(self) -> HealthResult: ...
```

Registry pattern: adding a new provider = one new adapter file + one registry entry. UI renders cards automatically from the registry.

**Ship in this MVP**

| Integration | State |
|---|---|
| SMTP email | Real (works with Mailpit in dev) + Mock |
| WhatsApp Cloud API | Adapter with **mock mode default**; real mode requires credentials, verified webhook, and recipient opt-in |
| Gmail API | Separate adapter, OAuth flow scaffolded, clearly marked "needs setup" |
| AI providers (OpenAI-compatible, Gemini, Mock) | Real adapters, mock default |
| Local file storage | Real; S3/GCS adapters stubbed |

**Show as "Coming soon" cards (disabled, feature-flagged, adapter stubs only)**
Google Calendar, Microsoft Outlook/Teams, Slack, Telegram, Google Drive/OneDrive, SMS gateway, Zapier/Webhooks (outbound), ICS calendar export.

**UI for each integration card:** status badge (`Not configured | Mock mode | Connected | Error`), "Configure" drawer with schema-driven form, **Test connection** button, **Send test message** button (to the current user only), last health check, last error, enable/disable toggle, and a link to setup docs.

**Rules**
- Credentials come from environment variables or are stored **encrypted** (Fernet key from env). Never returned to the client in plaintext; show masked values.
- Never send real messages unless: credentials configured **and** recipient opted in (where required) **and** message approved (or auto-send explicitly enabled for low-risk reminders) **and** kill-switch is off.
- Inbound webhooks verify signatures and are idempotent.
- Log all outbound/inbound events to `automation_logs` and `webhook_events`.

---

## 8. WORKFLOW RULES (deterministic rules engine)

Implement in `backend/app/rules/` as pure, unit-tested functions plus an orchestrator that logs each decision.

1. A task **cannot** be `Verified Complete` if mandatory evidence is missing.
2. A task **cannot** be `Verified Complete` if it has unsatisfied dependencies.
3. If a prerequisite is incomplete, dependent tasks are `Blocked` (with auto-filled `blocked_reason`).
4. If a deadline passes, mark **overdue**; notify owner and coordinator.
5. Evidence uploaded but not verified → `Completed Pending Evidence`.
6. Approval rejected → reopen the task or evidence requirement with a mandatory reason.
7. Escalate overdue **critical** tasks after configurable intervals.
8. Event readiness = weighted score of task completion, evidence verification, dependency health, and deadline risk (weights configurable, documented in `docs/READINESS_SCORE.md`).
9. Every rule decision and automation action is logged with inputs and outcome.
10. Detect and reject **circular dependencies** on creation.
11. Re-evaluate dependencies whenever a task, evidence, or approval changes.

---

## 9. UI / UX — CLEAN, MODERN, CONSISTENT

### 9.1 Design principles
- **Calm, information-dense, uncluttered.** Generous whitespace, clear hierarchy, one primary action per screen.
- Fast: skeleton loaders, optimistic updates, no layout shift.
- Accessible: WCAG AA contrast, full keyboard navigation, focus rings, ARIA labels, reduced-motion support.
- Responsive: desktop-first, fully usable on tablet and mobile (collapsible sidebar, bottom sheet drawers).

### 9.2 Design system
- Define **design tokens** in `frontend/src/styles/tokens.css` and Tailwind config: colors (neutral scale + one brand accent + semantic success/warning/danger/info), radius, spacing scale, shadows, typography (Inter or Geist; tabular numbers for metrics).
- **Light and dark themes**, system default, toggle in header.
- Status colors are consistent everywhere: Not Started (slate), In Progress (blue), Blocked (red), Completed Pending Evidence (amber), Verified Complete (green), Cancelled (gray-striped). Never rely on color alone — pair with icon + label.
- Priority badges (Low/Medium/High/Critical). AI elements share one distinct accent (e.g., violet sparkle icon) so users always know what is AI-generated.
- Build a small shared component library on top of shadcn/ui: `StatusBadge`, `PriorityBadge`, `AIBadge`, `ConfidenceMeter`, `StatCard`, `EmptyState`, `DataTable`, `FilterBar`, `PageHeader`, `ConfirmDialog`, `ApprovalCard`, `EvidenceCard`, `TimelineItem`, `UserAvatarStack`.
- Provide `/dev/components` (dev-only) showing every component in every state.

### 9.3 Layout & navigation
- Left **sidebar** (role-aware, collapsible, grouped): Dashboard · Events · Tasks · Evidence · AI Review · Communications · Approvals · People · Reports · Automation · Audit · Settings.
- Top bar: global search / `Ctrl+K`, event switcher, notifications bell, Copilot button, theme toggle, user menu.
- Breadcrumbs on deep pages. Context-aware **empty states** with a clear next action ("No tasks yet — create one or let AI suggest a starter list").
- Every list page: search, filters, sort, pagination, saved views, CSV export where allowed.

### 9.4 Required pages
1. Login / Register / Accept-invite / Forgot password (token flow can be mocked via mail)
2. Dashboard
3. Events list + Create-event wizard
4. Event detail (tabs per §6.1)
5. Task board (Kanban / table / calendar) with filters
6. Task detail (drawer and full page)
7. Dependency graph
8. Evidence upload & review
9. AI commitment extraction review
10. Communication drafts
11. Approvals
12. People (users, departments, contacts, invitations)
13. Integrations hub
14. Automation logs
15. Audit trail
16. Reports & event readiness
17. Admin settings (system, retention, kill-switch, AI provider, feature flags, AI usage)
18. Profile & notification preferences

### 9.5 Dashboard must show
Total events · Active tasks · Completed tasks · Blocked tasks · Overdue tasks · Missing evidence · Pending approvals · AI extraction queue · Automation success/failure · Event readiness score (gauge) · Critical risks (top 5 with deep links) · "Today" panel (what needs my action) · Risk radar summary (AI) · Recent activity.

---

## 10. AUTOMATION (scheduled background jobs)

1. Daily deadline scan
2. Overdue-task reminder generation (creates **drafts**, subject to approval policy)
3. Escalation after configured delay
4. Dependency re-evaluation on every task change
5. Evidence-status re-evaluation on upload/approval
6. Daily event-readiness report generation (+ AI risk radar)
7. Notification dispatch through email and WhatsApp (via the Integrations Hub)
8. Retry with exponential backoff and failure logging
9. **Global kill-switch** pausing all outbound automation (prominent in Admin and in the header when active)
10. Retention cleanup job
11. Integration health-check job

Every action is logged with: job name, trigger time, input data, result, success/failure, error message, retry count, actor (user or system). Provide a **manual "Run now"** button for each job (Admin/Coordinator) for demos and debugging.

---

## 11. SECURITY & COMPLIANCE

- Password hashing, JWT (short-lived access + refresh rotation), RBAC on every endpoint
- File-type + size validation, magic-byte checks, malware-scan **integration point** (stub + interface)
- Authenticated download endpoints or signed URLs
- Secrets only via environment; encrypted-at-rest integration credentials; no hard-coded keys
- Pydantic validation on all inputs; Zod on all forms
- Rate limiting on auth and AI endpoints
- CORS locked to configured origins; security headers; CSRF considered for cookie flows
- Audit logging for all sensitive actions (login, role change, evidence verification, approval, send, integration change, kill-switch)
- Data-retention and deletion settings; "export my data" and "delete my account" extension points
- Clear **MOCK MODE banner** in the UI when any integration runs in mock mode
- Opt-in tracking for WhatsApp/SMS; honor revocation immediately

---

## 12. EXTENSIBILITY (leave room for later)

Design every item below as an **interface + stub + docs**, so later work is additive, not a rewrite:

- `IntegrationAdapter` registry (§7)
- `LLMProvider` registry (§5.0)
- `StorageBackend` (local → S3/GCS)
- `VectorIndex` (pgvector semantic search)
- `NotificationChannel` (email, WhatsApp, in-app → SMS, Telegram, push)
- `RuleDefinition` plug-ins so new workflow rules can be registered without editing the orchestrator
- `event_templates` marketplace/import-export (JSON)
- Feature flags for every non-core module, with "Coming soon" UI states
- Multi-tenant readiness: add `organization_id` to core tables from day one (single default org in MVP)
- i18n scaffolding (`next-intl`) with English only for now
- Public REST API with API keys (extension point), outbound webhooks (extension point)
- Mobile PWA manifest (extension point)
- `docs/ROADMAP.md` listing every stub, what's needed to finish it, and priority

---

## 13. API CONVENTIONS

- Prefix `/api/v1`, OpenAPI auto-docs, typed TypeScript client generated from the OpenAPI schema.
- Consistent envelope: `{ "success": bool, "data": ..., "error": { "code", "message", "details" }, "meta": { "page", "page_size", "total" } }`
- Pagination on every list endpoint; filtering and sorting via query params.
- Idempotency keys for send/approve actions.
- Structured error codes; no stack traces to clients.

---

## 14. DEVELOPMENT PLAN

After **each phase** deliver: files created/modified · migrations · API endpoints · frontend pages · test cases · manual test steps · known limitations · next-phase plan · Walkthrough artifact with screenshots.

### Phase 1 — Foundation + clean UI shell *(START HERE)*
- Monorepo structure (`/frontend`, `/backend`, `/docs`, `/infra`), Docker Compose (Postgres, Redis, Mailpit, backend, frontend)
- `.env.example`, `Makefile` or scripts (`make up`, `make seed`, `make test`)
- Schema + Alembic migrations for all §4 tables (core tables fully implemented; later-phase tables created with models and migrations)
- Auth (register, login, refresh, logout, invite, accept-invite), RBAC, permission matrix + tests
- CRUD: users, departments, events (with create wizard), event team, contacts, tasks
- **Design system, theme (light/dark), sidebar, top bar, command palette, empty states, skeletons**
- Pages: Login/Register/Accept-invite, Dashboard (real counts), Events list, Create-event wizard, Event detail (Overview/Tasks/People tabs working; others placeholders with `Coming soon` states), Task board (Kanban + table), Task detail, People (users/departments/contacts/invitations), **Integrations hub UI (registry-driven; SMTP test works against Mailpit; WhatsApp in mock mode)**, Admin settings (kill-switch, feature flags), Profile
- **AI foundation:** `LLMProvider` interface, mock provider, `ai_runs` logging, Copilot panel UI shell (mock answers), AI badge/confidence components
- Seed data (below)
- README with setup in under 10 minutes

### Phase 2 — Workflow engine
Dependencies, status transitions, evidence requirements, evidence upload, approvals, blocking logic, circular-dependency check, audit logging, dependency graph.

### Phase 3 — AI layer
Real LLM adapters, document upload + text extraction (PDF/DOCX/text; OCR hook), commitment extraction + review UI, evidence classification, communication drafting, Copilot with real answers, smart task builder, duplicate detection.

### Phase 4 — Automation
Celery/Redis, schedulers, escalation engine, notification service, SMTP + WhatsApp Cloud adapters (real mode behind credentials), webhooks, automation logs UI, retries, kill-switch enforcement, "Run now".

### Phase 5 — Dashboard & reports
Full dashboard, readiness score, risk radar, reports, charts, PDF/CSV export, saved views, notification digest.

### Phase 6 — Testing & polish
Unit, API, frontend, Playwright E2E; demo event; API docs; deployment guide; project-report outline; accessibility pass; performance pass; `docs/ROADMAP.md`.

---

## 15. SEED DATA (Phase 1)

- **1 college event:** "Tech Fest 2026" (planning/active)
- **4 departments:** Technical, Logistics, Marketing, Finance
- **8 users** covering all five roles (at least one Super Admin, two Coordinators, three Department Members, one Approver, one Auditor) — demo password documented in README, dev only
- **15 tasks** across departments
- **6 dependencies**
- **8 evidence requirements**
- **2 overdue tasks**, **2 blocked tasks**, **2 tasks Completed Pending Evidence**
- 3 external contacts (one with WhatsApp opt-in, one without, to demo the opt-in rule)
- 1 event template, 2 pre-written communication drafts, 1 sample minutes document ready for later extraction
- Integrations preset: SMTP→Mailpit connected, WhatsApp in mock mode

---

## 16. QUALITY BAR & TESTING

- Tests required for: dependency rules, evidence rules, circular-dependency detection, permission matrix, AI-output parsing (valid/invalid/repair), opt-in enforcement, kill-switch.
- Backend ≥ 80% coverage on `rules/`, `auth/`, and `ai/parsers/`.
- Playwright critical flows: login → create event → add person → add task with dependency → upload evidence → blocked/unblocked state change → approve draft.
- Lint + type-check + format in CI config (ESLint, Prettier, Ruff, mypy).
- No `any` in TypeScript without justification; no unvalidated input; no secrets in repo.

---

## 17. CODING RULES

- Clean, modular, production-quality code; prefer simple, explainable architecture.
- TypeScript types on the frontend, Pydantic schemas on the backend; share contracts via generated OpenAPI types.
- Meaningful commits; small PRs.
- Handle errors gracefully with user-friendly messages and toasts; never fail silently.
- Document decisions in `docs/DECISIONS.md`; keep README, `.env.example`, and `docs/` current.

---

## 18. FIRST TASK — DO THIS NOW

1. Read this entire file.
2. Create the **Implementation Plan** and **Task List** artifacts for **Phase 1** only.
3. List any essential questions (maximum 5) with your proposed defaults; proceed with the defaults if I don't answer.
4. Build Phase 1 as specified in §14 and §15.
5. Run the stack, execute the tests, click through the main flows with the browser agent, and attach the **Walkthrough artifact**.
6. Provide setup instructions and the Phase 1 report.

**Do not proceed to Phase 2 until I review Phase 1.**
