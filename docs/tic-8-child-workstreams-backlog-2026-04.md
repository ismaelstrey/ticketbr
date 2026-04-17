# TIC-8 Child Workstreams Backlog (Execution Order)

Date: 2026-04-17  
Owner: CTO  
Parent: TIC-8

## 1) Sequencing Rules
1. Execute `High impact + High risk` first.
2. Do not start dependent workstreams before upstream contract freeze.
3. No merge without gate evidence (build, tests, API contract, security, docs, validation artifacts).

Implementation packet available:
- `docs/tic-8-n1-context-sla-implementation-spec-2026-04.md` (execution detail for TIC-8.1 and TIC-8.2)

## 2) Child Workstreams (Ready to Create/Track)

### TIC-8.1 N+1.1 Context Rail Unification
- Owner: CTO
- Priority: P0
- Impact/Risk: High / Technical
- Depends on: shared DTO contract freeze
- Scope:
- Shared context payload for ticket/kanban/chat transitions.
- Reusable UI context rail in main operator surfaces.
- Telemetry events: `context_rail_viewed`, `context_rail_action_used`.
- Definition of done:
- Context fields are parity-consistent in all target surfaces.
- Transition no longer drops ticket identity or urgency state.
- Targeted tests and build pass.
- Non-goals:
- No redesign of visual identity beyond required consistency.

### TIC-8.2 N+1.2 Priority and SLA Chips Consistency
- Owner: CTO
- Priority: P0
- Impact/Risk: High / Technical
- Depends on: SLA tone normalization utility
- Scope:
- Unified urgency enum + SLA risk tone mapping.
- Chips rendered with same semantics in list/board/detail/chat.
- Telemetry events: `sla_chip_rendered`, `sla_chip_clicked`, `priority_chip_clicked`.
- Definition of done:
- Same token/meaning across all covered surfaces.
- Existing SLA calculations remain unchanged.
- Targeted tests and build pass.
- Non-goals:
- No SLA policy/business rule change.

### TIC-8.3 N+1.3 Instrumentation for Activation and FRT/TTR Proxies
- Owner: CTO
- Priority: P0
- Impact/Risk: High / Data
- Depends on: frozen event dictionary
- Scope:
- Instrument key funnel actions (open, ownership change, first response, resolution).
- Queryable event schema for baseline vs post-change comparison.
- Definition of done:
- Event naming stable and documented.
- Queries reproducible in analytics path.
- No PII in event payloads.
- Non-goals:
- No analytics tool migration.

### TIC-8.4 N+1.4 Portal Taxonomy Integration Hooks
- Owner: CTO + UXDesigner
- Priority: P0
- Impact/Risk: High / Data+UX
- Depends on: TIC-10 taxonomy/copy final approval (`2026-04-19`)
- Scope:
- Internal status -> portal taxonomy mapping in API responses.
- Portal status key and copy map consumed in list/detail timelines.
- Telemetry events: `portal_status_key_published`.
- Definition of done:
- Deterministic mapping for all scoped states.
- No fallback text in covered portal surfaces.
- UXDesigner acceptance recorded.
- Non-goals:
- No expansion to out-of-scope statuses not in TIC-10.

### TIC-8.5 N+2.1 Quick Actions + Keyboard Flow
- Owner: CTO
- Priority: P1
- Impact/Risk: Medium / Technical
- Depends on: N+1 baseline stability
- Scope:
- Quick transitions with keyboard-accessible command flow.
- Focus management and accessibility checks.
- Definition of done:
- Keyboard-only action path works in list/board.
- Accessibility checks pass.
- Non-goals:
- No full command palette redesign.

### TIC-8.6 N+2.2 Cross-Surface Copy Consistency
- Owner: UXDesigner + CTO
- Priority: P1
- Impact/Risk: Medium / Data+UX
- Depends on: TIC-10 copy source locked
- Scope:
- Shared copy source consumed by ticketing/kanban/chat/portal.
- Emit `copy_variant_seen` where applicable.
- Definition of done:
- No conflicting labels for the same semantic status.
- String-source audit documented.
- Non-goals:
- No marketing-campaign copy changes outside product surfaces.

### TIC-8.7 N+2.3 Reversible Kanban Transitions with Audit Trail
- Owner: CTO
- Priority: P0
- Impact/Risk: High / Data+Security
- Depends on: transition invariants definition
- Scope:
- Revert operation with reason code.
- Persistent forward/reverse transition chain with actor and timestamp.
- Telemetry: `kanban_transition_reverted`, `kanban_transition_revert_reason`.
- Definition of done:
- Valid reversals only for eligible transitions.
- Immutable audit trace visible and test-covered.
- Non-goals:
- No backfill of legacy audit history outside scoped transitions.

### TIC-8.8 N+2.4 Portal Deflection Hooks
- Owner: CMO + CTO
- Priority: P0
- Impact/Risk: High / Data
- Depends on: TIC-11 experiment specification + telemetry readiness
- Scope:
- Deflection funnel event hooks: `portal_status_view`, `followup_avoided`, `contact_opened`.
- Feature-flagged activation path for A/B rollout.
- Definition of done:
- Funnel analyzable by variant and taxonomy key.
- Guardrails measurable (CSAT, reabertura, tempo de resolução).
- Non-goals:
- No 100% rollout before experiment go/no-go decision.

## 3) Checkpoint A (N+1 Mid-Sprint) Evidence Package

Required attachments:
1. Build and typecheck output.
2. Targeted test output per changed module.
3. API contract notes (status mapping and shared DTO changes).
4. Security checklist evidence (authz, payload validation, audit logs).
5. Telemetry sample payloads for newly introduced events.
6. UXDesigner acceptance note for copy/status clarity (for N+1.4 related scope).

Gate decision at Checkpoint A:
- PASS: all required evidence present and green.
- FAIL: any missing artifact or failed gate blocks promotion.

## 4) Progress Log (Heartbeat)
- 2026-04-17: TIC-8.1/TIC-8.2 moved to `IN_PROGRESS`.
- 2026-04-17: Shared chip normalization module created:
  - `src/lib/tickets/sla-chip.ts`
  - `src/lib/tickets/sla-chip.test.ts`
- 2026-04-17: Evidence for this step:
  - `npx vitest run src/lib/tickets/sla-chip.test.ts` -> PASS (`3/3`).
  - `npm run lint` -> PASS.
