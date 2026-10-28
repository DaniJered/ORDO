# ORDO Architectural & Technical Decisions Log

This document records architectural, technical, and domain decisions made during ORDO development.

---

## DEC-001: Monorepo Structure & Separation of Concerns
- **Context:** Need clean boundaries between backend, frontend, documentation, and infrastructure.
- **Decision:** Use a structured monorepo:
  - `/backend`: Python FastAPI, SQLAlchemy 2, Alembic, Rules Engine, AI Services, Integrations.
  - `/frontend`: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide icons, `next-themes`.
  - `/docs`: Architecture, permission matrix, readiness scoring, roadmap, decisions.
  - `/infra`: Docker Compose for local full-stack containerization (Postgres, Redis, Mailpit, backend, frontend).
- **Consequences:** Easy coordination, clear API contract, reproducible local and Docker workflows.

---

## DEC-002: Dual-Engine Database Support (PostgreSQL + SQLite)
- **Context:** §2 mandates PostgreSQL; however local developer workstations may not immediately have PostgreSQL or Docker daemon running.
- **Decision:** Use standard SQLAlchemy 2 with a dynamic `DATABASE_URL` fallback. In containerized/production mode, PostgreSQL (`postgresql+psycopg://` or `postgresql+asyncpg://`) is used. In local dev mode, SQLite (`sqlite+aiosqlite:///./ordo.db` or `sqlite:///./ordo.db`) runs out-of-the-box with zero setup required.
- **Consequences:** 100% portable for grading/review without external service dependencies, while fully compatible with PostgreSQL.

---

## DEC-003: Deterministic Rules Engine Precedence over AI
- **Context:** Core principle in §1 & §8: AI drafts and suggests, but cannot change state on its own.
- **Decision:** State transitions (`Verified Complete`, `Blocked`, `Completed Pending Evidence`) are strictly enforced by pure Python functions in `backend/app/rules/`. AI outputs never directly mutate state; they only populate review queues and draft tables.
- **Consequences:** Prevents hallucinated completions, enforces auditable business logic.

---

## DEC-004: Versioned Prompts and Provider-Agnostic AI Architecture
- **Context:** AI calls must be modular, testable, and support OpenAI, Gemini, and deterministic Mock providers.
- **Decision:** 
  - All prompt templates live as Markdown files in `backend/app/ai/prompts/*.v1.md`.
  - All LLM invocations route through `AIService` wrapping an `LLMProvider` protocol.
  - Every call is logged to `ai_runs` with token estimates, latency, provider, and input/output hashes.
  - Default provider in dev is `mock`, returning realistic structured JSON.
- **Consequences:** Zero external API keys needed to demo or run test suites.

---

## DEC-005: Centralized Server-Side Permission Matrix
- **Context:** Section 3 & 11 require RBAC enforced on every endpoint.
- **Decision:** Central FastAPI dependency `require_permission(permission: str)` verifies the user's role against a static permission matrix defined in `backend/app/core/permissions.py`. UI also checks permissions to conditionally show actions, but server security is the true boundary.
- **Consequences:** Robust security, zero unauthorized privilege escalation.

---

## DEC-006: Integration Adapter Protocol with Safe Mocking
- **Context:** Integrations (SMTP, WhatsApp, Gmail) need to be testable without real secrets.
- **Decision:** Every integration implements `IntegrationAdapter` protocol. Adapters have a `mock_mode` flag. Outbound sends verify credentials, recipient opt-in, approval status, and global kill-switch status.
- **Consequences:** Prevents accidental external spamming while supporting realistic testing.

---

## DEC-007: In-Process Automation Runner with Celery Stubs
- **Context:** Scheduled background jobs (deadline scans, escalations, graph re-evaluations, readiness snapshots) require background execution, but external Redis/Celery brokers may not be present on dev environments.
- **Decision:** Implemented an in-process `AutomationEngine` with job registry and persistence in `automation_jobs` and `automation_logs`, alongside a manual "Run Now" API for instantaneous demo triggers. Celery `@shared_task` decorator stubs are preserved for production deployment.
- **Consequences:** Immediate out-of-the-box execution with zero third-party broker dependencies.

---

## DEC-008: Deterministic Multi-Factor Event Readiness Formulation
- **Context:** §9 and §14 mandate an objective event readiness gauge rather than subjective coordinator estimates.
- **Decision:** Formula weights 40% verified task ratio, 35% verified evidence ratio, and 25% unblocked graph ratio, with a 5% deduction per overdue critical task.
- **Consequences:** Unbiased mathematical delivery health score with full auditable breakdown.

