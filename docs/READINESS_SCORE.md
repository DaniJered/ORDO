# ORDO Event Readiness Score Calculation Specification

The **Event Readiness Score** is a deterministic metric (0 to 100%) measuring whether an event is on track for execution without unverified requirements, blocked paths, or critical overdue bottlenecks.

---

## Formula & Weighting

$$\text{Readiness Score} = w_1 \cdot S_{\text{completion}} + w_2 \cdot S_{\text{evidence}} + w_3 \cdot S_{\text{dependency}} + w_4 \cdot S_{\text{deadline}}$$

Default Weights:
- **Task Completion ($w_1 = 0.35$):** Proportion of tasks marked `Verified Complete`.
- **Evidence Verification ($w_2 = 0.30$):** Mandatory evidence files uploaded and verified by an authorized approver.
- **Dependency Health ($w_3 = 0.20$):** Penalty for tasks stuck in `Blocked` status due to unsatisfied prerequisites.
- **Deadline Proximity & Overdue Status ($w_4 = 0.15$):** Penalty for overdue tasks, particularly Critical and High priority items.

---

## Status Bands
- **90% - 100%:** Ready / On Track (Green)
- **70% - 89%:** Moderate Risk / Action Needed (Amber)
- **< 70%:** High Risk / Blockers Present (Red)

AI Copilot and Risk Radar generate natural language summaries grounded solely on these deterministic outputs.

