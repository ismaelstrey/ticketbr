# TIC-6 - Weekly Engineering KPI Dashboard and Exec Cadence (M1 Plan)

Date: 2026-04-19  
Owner: CTO (`21cde635-8816-48fd-8ce3-caaa38bb68f6`)  
Issue: `TIC-6`  
Milestone target: **M1 - 2026-04-27**

## 1) Objective

Deliver by 2026-04-27:

- KPI metric dictionary (engineering execution KPIs)
- Dashboard structure (weekly executive view)
- First Monday executive report template
- Operational cadence to publish every Monday by 09:00 BRT

Dependency note: `TIC-4` is completed and unblocks this execution path.

## 2) Deliverables (M1 exit criteria)

1. `docs/kpi/engineering-kpi-dictionary.md`
2. `docs/kpi/engineering-exec-dashboard-spec.md`
3. `docs/kpi/engineering-weekly-exec-report-template.md`
4. Initial baseline snapshot section embedded in the first weekly report template
5. Operating runbook for data refresh + publication cadence

## 3) Execution schedule (BRT)

- **2026-04-19 to 2026-04-21 18:00**
  - Freeze KPI scope and formulas from `TIC-4`
  - Publish execution plan + risks/mitigations in `TIC-6` thread
- **2026-04-22**
  - Draft metric dictionary (definitions, formulas, source, owner, cadence)
- **2026-04-23**
  - Draft dashboard spec (sections, cards, trend windows, thresholds)
- **2026-04-24**
  - Draft Monday executive report template
  - Include risk register and mitigation ownership
- **2026-04-25**
  - Validate traceability (every KPI has source + owner + freshness rule)
  - Dry run with current known data availability
- **2026-04-26**
  - QA/peer review of content consistency and completeness
  - Apply final corrections
- **2026-04-27**
  - Publish final artifacts
  - Confirm M1 acceptance in `TIC-6`

## 4) KPI scope for this milestone

- `Roadmap predictability index`
- `Weekly exec report on-time rate`
- `CI pass rate`
- `MTTR baseline`
- `Qualified candidates in funnel` (cross-functional input from hiring tracker)

## 5) Risks and mitigations

| Risk | Impact | Probability | Mitigation | Owner | Trigger |
| --- | --- | --- | --- | --- | --- |
| KPI formula ambiguity across docs (`TIC-4` vs new artifacts) | Inconsistent reporting | Medium | Single source table with formula ID + explicit references | CTO | Any KPI with more than one formula in review |
| Missing freshness/data extraction routine for Monday deadline | Late or stale report | Medium | Add runbook with cutoff time + backup manual extraction path | CTO | Data not refreshed by Monday 08:00 BRT |
| `TIC-5` instrumentation not fully available for quality KPIs | Baseline gaps in CI/MTTR | High | Mark provisional baseline with confidence label; lock hard baseline in first post-`TIC-5` cycle | CTO | Missing CI/incident fields during dry run |
| No explicit reviewer window before 2026-04-27 | Rework at deadline | Medium | Reserve review slot on 2026-04-26 with QA/peer reviewer | CTO | No reviewer confirmation by 2026-04-25 12:00 BRT |
| Scope creep into non-M1 analytics | Deadline slip | Medium | Enforce M1 scope gate: dictionary + dashboard spec + template only | CTO | New metric requests after 2026-04-24 |

## 6) Acceptance checklist for M1

- [ ] KPI dictionary complete (formula, source, owner, cadence, threshold)
- [ ] Dashboard spec complete (sections, definitions, update cadence)
- [ ] Executive report template complete and executable in weekly cadence
- [ ] Risk register and mitigation ownership documented
- [ ] Publication readiness confirmed for Monday 09:00 BRT workflow

## 7) Immediate next actions started in this heartbeat

1. Publish this M1 plan in `TIC-6` issue thread (with risks/mitigations).
2. Begin artifact drafting under `docs/kpi/` in the next execution block.
3. Reserve QA review window for 2026-04-26.
