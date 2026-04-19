# TIC-3 - Founding Engineer Scorecard and Interview Loop

Owner: CTO  
Issue: TIC-3  
Last update: April 19, 2026

## Objective
Define a structured and evidence-based evaluation model for the Founding Full-Stack Engineer hire, with explicit quality and security gates.

## Evaluation scorecard (100 points)

| Dimension | Weight | Passing guidance |
|---|---:|---|
| System design and architecture | 25 | Strong tradeoff reasoning, scalability and failure handling |
| Hands-on coding quality | 25 | Production-grade code quality, testing strategy, delivery pragmatism |
| Reliability/security ownership | 20 | Must score >= 15/20 |
| Product and business alignment | 15 | Clear impact-based prioritization and KPI orientation |
| Collaboration and leadership | 15 | Ownership behavior, communication clarity, mentoring potential |

### Hiring thresholds
- Strong hire: total >= 80 and reliability/security >= 15.
- Hire with caveats: total 70-79 only with explicit mitigation plan and owner.
- No hire: total < 70, reliability/security < 15, or critical integrity/ownership red flag.

## Interview loop (stages, owners, outputs)

| Stage | Duration | Owner(s) | Required output |
|---|---:|---|---|
| Stage 1 - Screen | 30-40 min | CTO | Go/No-go + startup fit notes |
| Stage 2 - Technical deep dive | 60 min | CTO | Architecture score + risk notes |
| Stage 3 - Pair programming | 75 min | CTO | Coding score + testing signal |
| Stage 4 - Reliability/Security scenario | 45 min | CTO | Mandatory written security/reliability signal |
| Stage 5 - Founder fit | 30 min | CEO + CTO | Final recommendation and risk summary |

## Non-negotiable decision rules
- No candidate advances without a completed rubric for the current stage.
- Stage 4 must explicitly assess:
  - auth boundaries
  - secret handling
  - retry/idempotency judgment
  - abuse/rate-limit awareness
- Final decision debrief must happen within 24h of final stage completion.

## Deliverables produced for TIC-3
- Hiring package with role profile, scorecard, loop design, thresholds, and timeline.
- Interviewer calibration pack with hard gates and reusable feedback template.
- Hiring ops checklist with launch and governance tasks linked to this loop.

## Linked artifacts
- `docs/engineering-hiring-package-2026-04.md`
- `docs/hiring/interviewer-calibration-pack-2026-04.md`
- `docs/hiring/hiring-ops-kickoff-checklist-2026-04.md`
- `docs/hiring/weekly-founding-engineer-funnel-2026-w16.md`

## Exit criteria for TIC-3
- Scorecard weights and thresholds finalized.
- Interview loop stages and owners documented.
- Reliability/security gate is mandatory and documented.
- Structured decision protocol (written evidence + 24h debrief) documented.
