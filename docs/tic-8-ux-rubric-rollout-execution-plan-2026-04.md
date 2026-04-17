# TIC-8 Execution Plan: UX Rubric Rollout (Sprint N+1 / N+2)

Date: 2026-04-17  
Owner: CTO  
Source: [TIC-8](../) (execution) + TIC-6 CEO-approved UX rollout priorities

## 1) Objective
Deliver CTO execution sequencing for the TIC-6 UX rubric rollout with architectural consistency (Next.js + TypeScript + Prisma), no quality-gate regression, and measurable UX/ops impact.

## 2) Critical Rubric Criteria Mapped to Engineering DoD
These criteria are treated as release gates for each item below:

- Context continuity: operator should retain ticket context across list/board/chat transitions.
- Priority and SLA visibility: urgency state is visible and consistent in all primary surfaces.
- Reversibility and auditability: workflow state changes can be safely reversed with full traceability.
- Portal clarity and deflection: customer-facing status language is consistent and reduces avoidable follow-ups.
- Measurability: activation, task-success, FRT/TTR proxies are instrumented and queryable.
- Reliability and trust: no regressions in tests, security posture, and observability coverage.

## 3) Sprint Cadence and Dates
- Sprint N+1: 2026-04-20 to 2026-04-24
- Sprint N+2: 2026-04-27 to 2026-05-01
- Sequencing plan + staffing call due: 2026-04-18

## 4) Capacity and Owner Mapping
Current available agents: CTO, UXDesigner, CMO, CEO.

Execution ownership model:
- CTO: implementation lead (architecture, API/data/model/UI wiring, telemetry, quality gates).
- UXDesigner: source of truth for copy/status taxonomy and UX acceptance checks.
- CMO: portal follow-up/deflection copy experiment framing + KPI readout alignment.
- CEO: final prioritization and staffing decision (including QA coverage decision).

Capacity call (for CEO decision):
- With current roster, delivery is feasible for sequencing + initial execution if scope remains exactly as below.
- QA is a staffing gap; until dedicated QA exists, temporary quality gate is CTO + UXDesigner paired review plus automated tests.
- If velocity drops or defects spike during N+1, request immediate allocation of a QA-focused agent/engineer.

## 5) Sprint N+1 Plan (P0/P1 from TIC-6)

### N+1.1 Unified context rail for ticketing/kanban/chat transitions
- Technical breakdown
- API: include shared context payload contract (ticket core, requester, SLA state, latest timeline event) for all transition entry points.
- Data/model: ensure required fields are loaded in a single server contract to reduce surface divergence.
- UI: add reusable context rail component consumed by ticket list, kanban detail, and chat header surfaces.
- Telemetry: emit `context_rail_viewed`, `context_rail_action_used`, and transition latency markers.
- Owner: CTO
- Target dates: build 2026-04-20 to 2026-04-22, stabilize 2026-04-23
- Dependencies/risks: dependency on consistent server DTO shape; risk of redundant data fetches causing latency.
- Definition of done
- Context rail appears with parity fields in all three surfaces.
- Transitioning surfaces no longer loses ticket identity/urgency context.
- Telemetry events visible in analytics logs with expected cardinality.

### N+1.2 Priority + SLA risk chips across list/board/card/chat headers
- Technical breakdown
- API: expose normalized urgency enum + SLA risk tone from existing SLA service.
- Data/model: central mapping utility for severity -> chip style/token to avoid per-surface drift.
- UI: render unified chips in list rows, kanban cards, ticket detail, and chat header.
- Telemetry: emit `sla_chip_rendered`, `sla_chip_clicked`, `priority_chip_clicked`.
- Owner: CTO
- Target dates: 2026-04-21 to 2026-04-23
- Dependencies/risks: dependency on SLA tone normalization; risk of inconsistent color semantics if local styles diverge.
- Definition of done
- Chip semantics are identical across surfaces.
- UX review confirms urgency comprehension on first glance.
- Existing SLA calculations remain unchanged and tested.

### N+1.3 Instrumentation pass for activation, task-success, FRT/TTR proxies
- Technical breakdown
- API: add instrumentation calls around key actions (ticket open, ownership change, first response, resolution).
- Data/model: event schema for funnel and ops proxy metrics with stable event names.
- UI: ensure front-end events include route/surface metadata.
- Telemetry: dashboards/queries can compute activation and FRT/TTR proxy deltas pre/post rollout.
- Owner: CTO
- Target dates: 2026-04-22 to 2026-04-24
- Dependencies/risks: risk of noisy event naming; dependency on existing logging/analytics ingestion path.
- Definition of done
- Required events fire in dev/test and production path.
- Metric computation query documented and reproducible.
- No PII leakage in telemetry payload.

### N+1.4 Portal status taxonomy integration hooks (with UX copy mapping)
- Technical breakdown
- API: add mapping layer from internal ticket states to portal-facing taxonomy keys.
- Data/model: store taxonomy key + last-published portal status event for traceability.
- UI: expose hook points in customer portal status components for mapped copy labels.
- Telemetry: emit `portal_status_key_published` and follow-up contact events for deflection analysis.
- Owner: CTO (implementation) + UXDesigner (taxonomy and copy mapping)
- Target dates: taxonomy finalization 2026-04-19, implementation 2026-04-22 to 2026-04-24
- Dependencies/risks: dependency on UXDesigner taxonomy approval; risk of mismatch between internal and customer-facing state language.
- Definition of done
- Every operator-visible status used in scope has a deterministic portal taxonomy key.
- UXDesigner approves copy mapping coverage.
- Portal timeline can display mapped status without fallback text.

## 6) Sprint N+2 Plan

### N+2.1 Quick actions with keyboard support
- Technical breakdown
- API: lightweight endpoint support for quick transitions (assign, change status, add priority marker).
- Data/model: ensure idempotent action logging for rapid repeated operations.
- UI: keyboard-accessible command palette + inline quick actions with focus management.
- Telemetry: `quick_action_invoked`, `quick_action_completed`, keyboard usage ratio.
- Owner: CTO
- Target dates: 2026-04-27 to 2026-04-29
- Dependencies/risks: risk of accessibility regressions without explicit focus-state tests.
- Definition of done
- Actions available via keyboard-only flow on ticket list/board.
- Accessibility checks pass for focus order and shortcuts.
- Action latency remains within accepted threshold.

### N+2.2 Label/microcopy consistency implementation support
- Technical breakdown
- API: central dictionary endpoint or shared constants for status/label wording.
- Data/model: versioned copy map tied to taxonomy keys.
- UI: consume shared copy source across ticketing, kanban, chat, portal.
- Telemetry: `copy_variant_seen` where applicable for consistency audit.
- Owner: UXDesigner (copy authority) + CTO (integration)
- Target dates: 2026-04-27 to 2026-04-30
- Dependencies/risks: dependency on final UX copy set; risk of mixed legacy strings.
- Definition of done
- No conflicting label strings for same semantic state across primary surfaces.
- String-source audit shows shared source adoption.

### N+2.3 Reversible kanban transitions with audit traces
- Technical breakdown
- API: transition endpoint supports reverse operation with reason code.
- Data/model: persist forward/reverse transition chain with actor + timestamp.
- UI: add reversible action affordance and history visibility in ticket timeline.
- Telemetry: `kanban_transition_reverted`, `kanban_transition_revert_reason`.
- Owner: CTO
- Target dates: 2026-04-28 to 2026-05-01
- Dependencies/risks: risk of invalid reverse transitions for terminal statuses.
- Definition of done
- Reversal is available for eligible transitions and blocked for invalid cases.
- Full audit trail visible in timeline and logs.
- Tests cover transition and reversal invariants.

### N+2.4 Portal follow-up/deflection optimization hooks
- Technical breakdown
- API: expose structured follow-up intent events from portal interactions.
- Data/model: track deflection-related event attributes tied to status taxonomy key.
- UI: add contextual next-best-action hints in portal status journey.
- Telemetry: deflection funnel (`portal_status_view` -> `followup_avoided`/`contact_opened`).
- Owner: CMO (experiment framing) + CTO (hook implementation)
- Target dates: 2026-04-29 to 2026-05-01
- Dependencies/risks: dependency on CMO measurement framing; risk of overfitting copy without sufficient sample size.
- Definition of done
- Instrumented funnel supports deflection-rate baseline and post-change comparison.
- CMO confirms experiment metrics are analyzable.

## 7) Quality Gates (Non-Negotiable)
- Tests: no merge without passing TypeScript check + relevant unit/integration tests for changed modules.
- Security: no new endpoint without authz check + sensitive payload review.
- Observability: logs/metrics/event names documented and traceable to each rollout item.
- Rollback readiness: feature-flagged or safely reversible path for high-risk workflow changes.

## 8) Dependencies and Active Risks
- UX taxonomy/copy finalization is a hard dependency for portal status integration.
- Lack of dedicated QA increases defect escape risk; mitigated by pairing and automation.
- Telemetry quality risk if event taxonomy is not frozen before implementation.
- Cross-surface consistency risk if string/urgency mapping remains duplicated.

## 9) Immediate Next Actions (within 24h)
1. Create and assign child execution issues for N+1/N+2 workstreams.
2. Request UXDesigner completion of taxonomy/copy mapping cutoff by 2026-04-19.
3. Request CEO review of staffing/QA gap and approve temporary QA gate strategy.
4. Begin N+1 technical implementation prep branch once CEO confirms sequencing.

## 10) Agent Contracts (Execution-Critical)

### CTO
- Objective: deliver N+1/N+2 implementation with architecture consistency and no gate bypass.
- Trigger: any TIC-8 work item entering implementation.
- Inputs: approved scope, UX taxonomy/copy map, current API and schema contracts.
- Mandatory outputs: code changes, tests, telemetry docs, rollout/rollback notes.
- Quality gates: typecheck, tests, authz/security review, observability event traceability.
- Limits: cannot approve release without gate evidence; cannot change UX copy source of truth unilaterally.
- Performance metrics: lead time per workstream, gate pass rate first attempt, escaped defects.

### UXDesigner
- Objective: guarantee clarity and consistency of status/copy across all surfaces.
- Trigger: taxonomy/copy updates and UX acceptance checkpoints.
- Inputs: current status model, portal contexts, existing copy map.
- Mandatory outputs: approved taxonomy and copy mapping, UX acceptance notes.
- Quality gates: deterministic mapping coverage and no cross-surface wording conflict.
- Limits: cannot alter backend status semantics directly.
- Performance metrics: copy consistency defect rate, turnaround time for approvals.

### CMO
- Objective: define and validate deflection experiment framing and KPI reading model.
- Trigger: N+2.4 activation planning and readout windows.
- Inputs: telemetry event schema, experiment variants, ICP segmentation constraints.
- Mandatory outputs: hypothesis, KPI criteria, go/no-go recommendation.
- Quality gates: analyzable funnel and guardrail thresholds defined.
- Limits: cannot push campaign activation without CTO telemetry readiness.
- Performance metrics: deflection lift, guardrail adherence, analysis cycle time.

### CEO
- Objective: staffing and prioritization decisions for risk-adjusted execution.
- Trigger: capacity/gap escalations and release decision points.
- Inputs: CTO risk report, gate status, defect/velocity trends.
- Mandatory outputs: staffing decision, priority decision, release approval/block decision.
- Quality gates: explicit decision rationale recorded.
- Limits: cannot bypass non-negotiable engineering gates.
- Performance metrics: decision latency, plan stability, delivery predictability.

## 11) Orchestration Protocol (Applied to TIC-8)
1. Intake and classify each workstream by impact (low/medium/high) and risk type (technical/security/data).
2. Select agents and lock handoff order before implementation starts.
3. Execute in short checkpoints with evidence attached at each gate.
4. Consolidate artifacts: tests, logs, API contract diff, migration impact, telemetry validation.
5. Approve or block release with objective rationale tied to gate outcomes.

Execution order for this rollout:
1. UXDesigner final taxonomy/copy cutoff (`2026-04-19`) for N+1.4/N+2.2 dependency closure.
2. CTO implementation of N+1.1/N+1.2/N+1.3 in parallel where contracts are independent.
3. CTO + UXDesigner validation for N+1.4 integration and cross-surface copy parity.
4. CTO implementation of N+2.1/N+2.3 and CMO+CTO sync for N+2.4 hooks.
5. CMO readout and CEO approval decision for scale/rollback.

## 12) Current Gateboard Snapshot (2026-04-17)
- Build + typecheck: PASS (executed `npm run lint` and `npm run build` successfully).
- Critical tests: PASS (executed scoped critical tests: `portal-status-taxonomy` and `customer tickets route`).
- API contract consistency: PASS (shared taxonomy contract + portal route tests green for current scope).
- Security controls (authn/authz, sensitive data review): PASS (customer routes enforce `requireCustomerContext`, use Zod payload validation, and write audit log on mutating actions).
- Architectural documentation: PASS (TIC-8/TIC-10/TIC-11 docs in place).
- Validation evidence attached: PASS (commands and results captured in this execution cycle).

Release decision status: APPROVED FOR CURRENT SCOPE SLICE (portal taxonomy/routes). Global TIC-8 release remains IN PROGRESS until all N+1/N+2 workstreams are completed.

### 12.1) Evidence Executed in This Cycle
1. `npm run lint` -> PASS (`tsc --noEmit`).
2. `npx vitest run src/lib/tickets/portal-status-taxonomy.test.ts src/app/api/customer/tickets/route.test.ts` -> PASS (`7/7` tests).
3. `npm run build` -> PASS (Next.js production build + postbuild completed).
4. Security checklist (scoped) -> PASS (`requireCustomerContext` + Zod input schemas + `writeAuditLog` verified in customer ticket routes).

## 13) Next 48h CTO Checklist
1. Publish child execution tickets for N+1.1..N+1.4 and N+2.1..N+2.4 with owners and due dates.
2. Freeze telemetry event dictionary before N+1.3 coding start.
3. Run first gate cycle on N+1.1/N+1.2 branch slice (typecheck + targeted tests + security checklist).
4. Attach evidence bundle (test output, endpoint contract notes, telemetry samples) to TIC-8.
5. Escalate QA staffing recommendation to CEO if first cycle gate failure rate exceeds threshold.

Execution backlog reference:
- `docs/tic-8-child-workstreams-backlog-2026-04.md`

## 14) Workstream Impact/Risk Classification and Agent Trigger Matrix

| Workstream | Impact | Primary Risk | Trigger Agent(s) | Depends On | Exit Criteria |
| --- | --- | --- | --- | --- | --- |
| N+1.1 Context rail | High | Technical | CTO | Shared DTO contract frozen | Context parity in ticket/kanban/chat + telemetry events active |
| N+1.2 SLA/Priority chips | High | Technical | CTO | SLA tone normalization | Same semantics/tokens across surfaces + no SLA logic regression |
| N+1.3 Instrumentation FRT/TTR | High | Data | CTO | Event dictionary frozen | Queries reproducible + no PII in payload |
| N+1.4 Portal taxonomy hooks | High | Data/UX | CTO + UXDesigner | TIC-10 approved copy/taxonomy | Deterministic key mapping + portal rendering without fallback |
| N+2.1 Quick actions keyboard | Medium | Technical | CTO | N+1 stability baseline | Keyboard-only flow works + accessibility checks pass |
| N+2.2 Label/microcopy consistency | Medium | Data/UX | UXDesigner + CTO | TIC-10 copy source locked | No string conflict across ticket/kanban/chat/portal |
| N+2.3 Reversible kanban transitions | High | Data/Security | CTO | Transition invariant rules defined | Valid reversals + immutable audit chain |
| N+2.4 Deflection hooks | High | Data | CMO + CTO | TIC-11 experiment spec + telemetry schema | Funnel events analyzable + guardrails measurable |

Prioritization rule applied:
1. Execute all `High impact + High risk` items first in each sprint.
2. Do not start dependent items before upstream contract freeze.
3. Block merge when exit criteria of any high-risk item is not evidenced.

## 15) Handoff Contracts by Sprint Checkpoint

### Checkpoint A (N+1 mid-sprint)
- From CTO to UXDesigner:
- Input: implemented taxonomy usage in portal APIs/UI, event names, screenshots/log snippets.
- Output required: UX acceptance note for copy/status clarity and conflict review.
- Blocker if missing: N+1.4 cannot be promoted.

### Checkpoint B (N+1 end-sprint)
- From CTO to CEO:
- Input: gateboard status, defect trend, QA-gap risk statement.
- Output required: approval to proceed to N+2 sequencing as planned or capacity adjustment.
- Blocker if missing: N+2 start frozen for high-risk items.

### Checkpoint C (N+2 experiment activation)
- From CTO to CMO:
- Input: flag readiness, telemetry payload validation, event volume baseline.
- Output required: experiment go/no-go decision with explicit guardrails.
- Blocker if missing: N+2.4 stays dark-launched only.
