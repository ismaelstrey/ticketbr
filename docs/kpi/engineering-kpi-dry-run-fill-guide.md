# Engineering KPI Dry-Run Fill Guide (TIC-6)

Version: 2026-04-19  
Owner: CTO

## Purpose

Standardize the dry-run process for filling the weekly executive KPI report before publication day.

## Inputs required

- KPI dictionary: `docs/kpi/engineering-kpi-dictionary.md`
- Dashboard spec: `docs/kpi/engineering-exec-dashboard-spec.md`
- Weekly template: `docs/kpi/engineering-weekly-exec-report-template.md`
- Publication runbook: `docs/kpi/engineering-weekly-publication-runbook.md`

## Dry-run sequence (target: complete by 2026-04-24)

1. Create a draft report file in `docs/kpi/reports/` for the target week.
2. Fill metadata and freshness flag.
3. Fill KPI snapshot row-by-row using dictionary formulas.
4. Add confidence levels and caveats where data is provisional.
5. Populate executive reading with:
- trend summary,
- top risk,
- immediate action.
6. Validate commitments/milestones section with current issue board status.
7. Validate top risks table has owner + due date.
8. Confirm publication log fields are complete.

## Validation checklist

- Every KPI row has current value, target, status, confidence, and notes.
- Every caveat has an owner and resolution action.
- No section left with placeholders.
- Executive reading is concise and decision-oriented.
- File is linkable from `TIC-6` thread as evidence.

## Output

- Dry-run report draft ready for executive review.
- List of data gaps to close before Monday 09:00 BRT.
