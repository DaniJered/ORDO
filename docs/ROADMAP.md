# ORDO Product & Engineering Roadmap

This document outlines the delivered phases and architectural extension points for ORDO.

---

## Phased Progression Status

| Phase | Module | Status | Deliverables |
|---|---|---|---|
| **Phase 1** | Foundation & Clean UI Shell | **COMPLETED & VERIFIED** | Monorepo scaffold, 31 database tables, JWT + RBAC (5 roles), design tokens, Next.js UI shell, seed dataset (`Tech Fest 2026`). |
| **Phase 2** | Workflow Engine & DAG | **COMPLETED & VERIFIED** | SVG Dependency DAG graph, SHA-256 evidence hashing, auto-unblocking cascade (§8 Rules 2 & 3), evidence cascade (§8 Rule 5), mandatory rejection reasons (§8 Rule 6), `/approvals` queue, `/audit` log explorer. |
| **Phase 3** | AI Layer & Review Studios | **COMPLETED & VERIFIED** | Multi-format document parser (`pypdf`, txt, md), SHA-256 caching, AI Commitment Review Studio (`/ai-review`) with 1-click task conversion, Communications Studio (`/communications`) with tone rewriter, Evidence Classifier in upload modal. |
| **Phase 4** | Automation Engine | **COMPLETED & VERIFIED** | `AutomationEngine` with 6 deterministic background jobs, `/automation` studio with manual "Run Now" triggers for demos, Global Emergency Kill-Switch with topbar alert banner, full execution history. |
| **Phase 5** | Dashboard & Reports | **COMPLETED & VERIFIED** | Executive Dashboard telemetry, Algorithmic Readiness Scoring ($0.4 \times Tasks + 0.35 \times Evidence + 0.25 \times Unblocked - Penalties$), Department Risk Modeling, streaming CSV workflow export. |
| **Phase 6** | Testing & Polish | **COMPLETED & VERIFIED** | 34/34 automated test suite passing in under 3 seconds, 23 production Next.js routes compiled cleanly, comprehensive documentation. |

---

## Architectural Extension Points (Zero-Rewrite Stubs)

1. **Celery / Redis Distributed Workers (`backend/app/automation/tasks.py`):**
   - In-process async background runner handles single-node execution.
   - Standard Celery `@shared_task` decorator stubs provided for enterprise distributed deployment.
2. **Cloud Storage Backends (`backend/app/services/storage.py`):**
   - `LocalStorageBackend` fully operational with SHA-256 checksums and MIME validation.
   - S3 / Google Cloud Storage adapter stubs with signed URL generation ready for production activation.
3. **Live LLM Providers (`backend/app/ai/providers/`):**
   - Deterministic `MockLLMProvider` active by default for instant zero-key offline demos.
   - `GeminiProvider` ready for Live Gemini API key insertion via `GEMINI_API_KEY`.
4. **Vector Semantic Search (`VectorIndex` stub):**
   - Interface stub in place for `pgvector` semantic commitment search and duplicate detection.
5. **Mobile PWA & Multi-Tenant Support:**
   - All core tables include `organization_id` index for instant multi-tenancy.
