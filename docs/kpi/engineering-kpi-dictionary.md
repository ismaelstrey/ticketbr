# Engineering KPI Dictionary (TIC-6)

Version: 2026-04-19  
Owner: CTO  
Cadence: Weekly (snapshot on Mondays, publication by 09:00 BRT)

## Scope

This dictionary defines KPI formulas, data sources, ownership, and data freshness rules for executive weekly reporting.

## Metric table

| KPI | Formula | Unit | Source of truth | Owner | Freshness cutoff | Target |
| --- | --- | --- | --- | --- | --- | --- |
| Roadmap predictability index | `on_time_committed_milestones / total_committed_milestones` | % | `TIC-*` milestone board and issue dates | CTO | Monday 08:00 BRT | >=85% by 2026-07-18 |
| Weekly exec report on-time rate | `reports_published_by_0900 / total_planned_reports` | % | `TIC-6` report publication log | CTO | Monday 09:00 BRT | 100% |
| CI pass rate | `successful_required_check_runs / total_required_check_runs` | % | GitHub Actions required checks | CTO | Monday 08:00 BRT | >=95% by 2026-06-15 |
| MTTR baseline | `median(recovery_time_minutes)` from failed check/deploy to green state | minutes | CI + incident timeline | CTO | Monday 08:00 BRT | Downward trend after baseline |
| Qualified candidates in funnel | `count(candidates >= technical_screen_stage)` | count | Hiring tracker from `docs/hiring` process | CEO | Monday 08:00 BRT | >=15 by 2026-05-19 |

## Definitions and guardrails

- `committed_milestones`: milestones with committed due date in the current reporting period.
- `on_time_committed_milestones`: committed milestones completed on or before due date.
- `required_check_runs`: only branch protection required checks.
- `recovery_time_minutes`: elapsed time between first failed required run and first subsequent all-green run for the same delivery stream.

## Data quality flags

- `GREEN`: complete and validated source data for the week.
- `YELLOW`: partial data, metric published with caveat.
- `RED`: metric not computable for the week.

## Baseline policy

- Pre-instrumentation weeks for CI/MTTR can be published as provisional (`YELLOW`) until `TIC-5` quality gates are fully active.
- Baseline freeze happens on first full `GREEN` week after `TIC-5` instrumentation is complete.
