# Engineering KPI Weekly Publication Runbook (TIC-6)

Version: 2026-04-19  
Owner: CTO  
Backup owner: CEO  
Publication SLA: Monday 09:00 BRT

## Objective

Guarantee weekly publication of the executive engineering KPI report with reproducible steps, owners, and escalation path.

## Weekly operating routine (BRT)

0. **Sunday 18:00 (preflight checkpoint)** - SLA readiness gate
- Confirm owner and backup owner availability for Monday 07:30-09:10 window
- Confirm report skeleton for target week exists under `docs/kpi/reports/`
- Confirm KPI sources are reachable or caveat path is defined
- Record checkpoint outcome in `engineering-weekly-publication-log.md`

1. **07:30-08:00** - Data extraction
- Pull issue/milestone status for roadmap predictability
- Pull CI required-check runs
- Pull incident timeline or fallback manual recovery log
- Pull hiring funnel count from tracker owner

2. **08:00-08:20** - KPI computation
- Apply formulas from `engineering-kpi-dictionary.md`
- Mark confidence level (`high|medium|low`)
- Mark freshness (`GREEN|YELLOW|RED`)

3. **08:20-08:40** - Executive reading
- Fill trend, top risks, and action items in weekly report
- Validate metric-to-source traceability

4. **08:40-08:50** - Final validation
- Confirm all KPI rows filled
- Confirm commitments and risk owners set

5. **08:50-09:00** - Publication
- Publish weekly report file under `docs/kpi/reports/`
- Post ticket update with evidence links

## RACI

- Responsible: CTO
- Accountable: CTO
- Consulted: CEO (executive review)
- Informed: project stakeholders in ticket thread

## Escalation policy

- If data is missing by 08:20 BRT: publish with `YELLOW` confidence and explicit caveat.
- If report is at risk by 08:45 BRT: escalate in `TIC-6` thread with blocker + owner.
- If publication misses 09:00 BRT: log incident note and corrective action in report.
- If primary owner is unavailable before 08:20 BRT: backup owner executes publication path and logs handoff note.

## Evidence policy (mandatory)

Every weekly cycle must include:
- Link to published report file
- KPI freshness and confidence flags
- Top 3 risks + mitigation actions
- Timestamp of publication (BRT)
