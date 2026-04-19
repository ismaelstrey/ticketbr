# TIC-6 M1 Traceability Checklist

Date: 2026-04-19  
Owner: CTO

## Acceptance traceability

| Acceptance item | Evidence | Status |
| --- | --- | --- |
| KPI metrics defined | `docs/kpi/engineering-kpi-dictionary.md` | DONE |
| Formula and source per KPI | `docs/kpi/engineering-kpi-dictionary.md` | DONE |
| Dashboard structure published | `docs/kpi/engineering-exec-dashboard-spec.md` | DONE |
| Weekly routine published | `docs/kpi/engineering-weekly-publication-runbook.md` | DONE |
| First weekly report with executive reading | `docs/kpi/reports/2026-04-27-engineering-weekly-exec-report.md` | DONE |
| Risk and mitigation captured | `docs/tic-6-weekly-engineering-kpi-dashboard-exec-plan-2026-04.md` + weekly report | DONE |

## KPI-to-report mapping

| KPI | Dictionary entry | Report row | Confidence handling |
| --- | --- | --- | --- |
| Roadmap predictability index | Present | Present | `high|medium|low` + caveat notes |
| CI pass rate | Present | Present | provisional allowed until `TIC-5` full coverage |
| MTTR baseline | Present | Present | provisional allowed until `TIC-5` full coverage |
| Weekly exec report on-time rate | Present | Present | direct SLA check |
| Qualified candidates in funnel | Present | Present | cross-functional sync note |

## Open item before M1 close

- Replace provisional quality KPI values (`CI pass rate`, `MTTR`) with full-confidence values once `TIC-5` baseline instrumentation is confirmed.
