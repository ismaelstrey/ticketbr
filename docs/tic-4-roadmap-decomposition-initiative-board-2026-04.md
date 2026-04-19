# TIC-4 - Roadmap Decomposition Into Initiative Board With KPIs (2026-04)

## 1. Objective and scope
Convert the 90-day technical execution scope from `TIC-2` into an actionable initiative board with:
- initiative lanes (`A/B/C`),
- task-level owners and deadlines,
- measurable KPI baseline and targets,
- explicit dependencies and handoff order.

Planning window: 2026-04-19 to 2026-07-18 (90 days).

## 2. Initiative board (A/B/C)

| Initiative | Focus | Owner | Active Issues | Window | Primary KPI | Baseline (as of 2026-04-19) | 90-day target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A - Capacity | Build founding engineering capacity and hiring throughput | CEO + CTO | `TIC-3` (done) | Day 0-30 | Qualified candidates in funnel | 0 qualified candidates tracked in current cycle | >=15 qualified candidates by 2026-05-19 |
| B - Delivery Quality | Enforce CI/security/observability quality gates | CTO | `TIC-5` (todo) | Day 10-60 | CI pass rate (required checks) | Baseline not instrumented yet (`N/A`) | >=95% pass rate by 2026-06-15 |
| C - Predictability & Cadence | Publish roadmap execution model and weekly KPI dashboard cadence | CTO | `TIC-4` (in progress), `TIC-6` (todo) | Day 0-90 | Roadmap predictability index | Baseline definition pending first weekly report | >=85% by 2026-07-18 |

## 3. Task-level decomposition and acceptance criteria

| Issue | Initiative | Owner | Deadline | Acceptance criteria | KPI impact |
| --- | --- | --- | --- | --- | --- |
| `TIC-3` | A | CEO | 2026-04-26 | Scorecard, interview loop, rubric, and sourcing checklist published; hiring packet stored in repo | Creates hiring throughput baseline input |
| `TIC-4` | C | CTO | 2026-04-28 | Initiative board (`A/B/C`) published with owners, deadlines, dependencies, KPI formulas, and milestone table | Publishes predictability measurement framework |
| `TIC-5` | B | CTO | 2026-05-03 | CI required checks defined; dependency/security scan in place; logging/SLO alert baseline documented | Enables CI pass rate + MTTR metrics |
| `TIC-6` | C | CTO | 2026-04-27 | KPI metric dictionary, dashboard structure, and first Monday executive report template delivered | Establishes weekly KPI reporting cadence |

## 4. Milestones and sequencing

| Milestone | Date | Exit criteria | Depends on |
| --- | --- | --- | --- |
| M1 - Governance artifacts frozen | 2026-04-27 | `TIC-6` metric dictionary and report template ready | `TIC-4` draft complete |
| M2 - Roadmap decomposition finalized | 2026-04-28 | `TIC-4` document approved and shared in issue thread | `TIC-6` structure validated |
| M3 - Quality gate baseline live | 2026-05-03 | `TIC-5` CI/security/observability baseline active | M2 |
| M4 - First predictability snapshot | 2026-05-04 | First Monday KPI report includes predictability baseline and risk notes | M3 |
| M5 - 30-day review | 2026-05-19 | Hiring and delivery KPIs compared to targets; corrective actions assigned | M4 |
| M6 - 60-day review | 2026-06-18 | Quality trend and throughput trend stable for 4 consecutive weeks | M5 |
| M7 - 90-day board review | 2026-07-18 | KPI targets evaluated and next-quarter roadmap prepared | M6 |

## 5. KPI definitions (source of truth)

| KPI | Formula | Source | Owner | Cadence |
| --- | --- | --- | --- | --- |
| Qualified candidates in funnel | Count of candidates at or beyond technical screen stage | Hiring tracker from `docs/hiring` | CEO | Weekly |
| CI pass rate | Successful required-check runs / total required-check runs | CI pipeline runs (GitHub Actions) | CTO | Weekly |
| MTTR baseline | Median time from failed deployment/check to recovered green state | Incident/CI logs | CTO | Weekly |
| Roadmap predictability index | On-time completed committed milestones / total committed milestones in period | Issue board timeline (`TIC-*`) | CTO | Weekly |
| Weekly exec report on-time rate | Reports published by Monday 09:00 BRT / total planned weeks | `TIC-6` report cadence | CTO | Weekly |

## 6. Dependency map and critical path

1. `TIC-4` must finalize before `TIC-5` and `TIC-6` can be measured consistently.
2. `TIC-6` must land before the first KPI baseline publication.
3. `TIC-5` must land before quality KPIs (`CI pass rate`, `MTTR`) become valid.
4. First predictability baseline publication depends on `TIC-4 + TIC-6 + initial TIC-5 instrumentation`.

Critical path: `TIC-4 -> TIC-6 -> TIC-5 -> first baseline snapshot`.

## 7. Immediate next actions after this decomposition

1. Complete `TIC-6` by 2026-04-27 with metric dictionary and report template.
2. Start `TIC-5` implementation immediately after `TIC-4` closure to avoid KPI blind window.
3. Publish first KPI baseline report on 2026-05-04 with explicit risk and mitigation owners.

## 8. Quality status for TIC-4 deliverable

| Gate | Status | Evidence |
| --- | --- | --- |
| Initiative board (`A/B/C`) | PASS | Section 2 |
| Task-level acceptance criteria | PASS | Section 3 |
| Milestone dates | PASS | Section 4 |
| KPI baseline and formulas | PASS | Section 5 |
| Dependency/handoff clarity | PASS | Section 6 |
