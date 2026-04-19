# TIC-22 SLA Publication Gate Checklist (TIC-6)

Window: 2026-04-26 18:00 BRT -> 2026-04-27 09:10 BRT  
Primary owner: CTO  
Backup owner: CEO  
Target issue: `TIC-6`

## Objective

Guarantee auditable, on-time publication of the official weekly engineering executive report at 2026-04-27 09:00 BRT.

## Mandatory evidence set

1. Official report file published: `docs/kpi/reports/2026-04-27-engineering-weekly-exec-report.md`
2. KPI-level freshness and confidence labels present in the report.
3. Cadence log updated: `docs/kpi/engineering-weekly-publication-log.md` (actual publish time + on-time result).
4. Final TIC-6 thread update posted by 2026-04-27 09:10 BRT with links + residual risk confirmation.

## Checkpoint 1 - Preflight (2026-04-26 18:00 BRT)

- Owner and backup owner availability confirmed.
- Report file exists and has baseline content.
- Data-source readiness confirmed or fallback caveats prepared.
- Preflight row updated in publication log.

Exit condition: `GO` for Monday window or blocker registered immediately in `TIC-6`.

## Checkpoint 2 - Publication window (2026-04-27 07:30-09:00 BRT)

- Run weekly publication runbook steps in order.
- Keep confidence/freshness annotations explicit for every KPI row.
- Publish by 09:00 BRT and record exact BRT timestamp.

Exit condition: report published and traceability complete.

## Checkpoint 3 - Final signaling (by 2026-04-27 09:10 BRT)

Post in `TIC-6` thread:

```md
SLA publication gate status: CLOSED (2026-04-27 cycle)

- Report: docs/kpi/reports/2026-04-27-engineering-weekly-exec-report.md
- Publication log: docs/kpi/engineering-weekly-publication-log.md
- Published at (BRT): <timestamp>
- On-time status: <true|false>
- Residual risks: <brief summary>
```

If not published by 09:00 BRT, replace status with `BREACH`, include root cause, and assign corrective owner + date.
