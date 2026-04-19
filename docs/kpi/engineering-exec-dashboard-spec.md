# Engineering Executive Dashboard Spec (TIC-6)

Version: 2026-04-19  
Owner: CTO

## Objective

Provide a weekly executive dashboard with a fixed structure to track delivery predictability, quality, and execution cadence.

## Layout

1. Header strip
- Week identifier (`YYYY-WW`)
- Publish timestamp (BRT)
- Data freshness status (`GREEN/YELLOW/RED`)

2. KPI cards (top row)
- Roadmap predictability index
- CI pass rate
- MTTR baseline
- Weekly exec report on-time rate
- Qualified candidates in funnel

3. Trend panel (middle)
- 4-week trend sparkline per KPI
- Week-over-week delta and direction

4. Risk and mitigation panel
- Top 3 execution risks for the week
- Mitigation owner and due date

5. Commitments and misses panel
- Committed milestones due this week
- Completed on-time vs delayed

## KPI card contract

Each card must include:
- `current_value`
- `target_value`
- `delta_vs_prev_week`
- `status_color` (`green`, `yellow`, `red`)
- `confidence` (`high`, `medium`, `low`)
- `data_timestamp_brt`

## Threshold defaults

- Roadmap predictability index:
  - green: `>=85%`
  - yellow: `70%-84.99%`
  - red: `<70%`
- CI pass rate:
  - green: `>=95%`
  - yellow: `85%-94.99%`
  - red: `<85%`
- MTTR baseline:
  - green: improving trend for >=2 consecutive weeks
  - yellow: stable
  - red: worsening trend
- Exec report on-time rate:
  - green: `100%`
  - red: `<100%`
- Qualified candidates in funnel:
  - green: on trajectory to 30-day target
  - yellow/red: off trajectory based on linear pacing check

## Update pipeline

1. Collect data snapshots by Monday 08:00 BRT.
2. Compute KPI values and confidence labels.
3. Render dashboard artifacts.
4. Publish executive report by Monday 09:00 BRT.
5. Log publication timestamp and exceptions.

## Non-goals for M1

- Real-time streaming dashboard
- Automated anomaly detection
- Additional KPIs beyond TIC-4 scope
