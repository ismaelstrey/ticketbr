# Interviewer Calibration Pack - Founding Engineer

Owner: CTO  
Version: 1.0  
Date: April 16, 2026

## 1) Objective
Standardize interviewer signals so candidate decisions are evidence-based, comparable across stages, and aligned with TicketBR quality/security bar.

## 2) Interview loop and owners
| Stage | Duration | Primary owner | Decision output |
|---|---:|---|---|
| Stage 1 - Screen | 30-40 min | CTO | Go/No-go + startup-fit notes |
| Stage 2 - Technical deep dive | 60 min | CTO | Architecture score + risks |
| Stage 3 - Pair programming | 75 min | CTO | Coding score + test strategy signal |
| Stage 4 - Reliability/Security scenario | 45 min | CTO | Mandatory written reliability/security signal |
| Stage 5 - Founder fit | 30 min | CEO + CTO | Final alignment recommendation |

## 3) Scoring model (100 points)
| Dimension | Weight | Scoring guidance |
|---|---:|---|
| System design and architecture | 25 | 0-10 weak, 11-18 acceptable, 19-25 strong |
| Hands-on coding quality | 25 | 0-10 weak, 11-18 acceptable, 19-25 strong |
| Reliability/security ownership | 20 | Must be >= 15 to pass hiring threshold |
| Product and business alignment | 15 | Impact-based prioritization quality |
| Collaboration and leadership | 15 | Ownership clarity and communication quality |

## 4) Hard gates
- Candidate cannot move forward without written rubric for current stage.
- Stage 4 must include explicit statements on:
  - auth boundary correctness
  - secret handling discipline
  - failure/retry/idempotency judgment
  - abuse/rate-limit awareness
- No final offer recommendation without completed Stage 4 signal.

## 5) Signal definitions
### Strong hire signal
- Total score >= 80
- Reliability/security >= 15/20
- No integrity red flags
- Clear ownership behavior under ambiguity

### Hire with caveats
- Total score 70-79
- Must include explicit mitigation plan and owner
- Reliability/security cannot be < 15/20

### No hire
- Total score < 70
- Any major ownership or integrity red flag
- Inconsistent evidence between interviewers without resolution

## 6) Debrief protocol
- Debrief starts within 24h after final completed stage.
- Every interviewer submits written evidence before debrief starts.
- Final recommendation format:
  - Recommendation: Strong hire / Hire with caveats / No hire
  - Evidence summary per dimension
  - Top 3 risks and mitigation if applicable

## 7) Calibration checklist (before first candidate)
- [ ] CEO and CTO reviewed scoring model and hard gates
- [ ] Interview question bank mapped to score dimensions
- [ ] Feedback template shared and tested in dry-run
- [ ] Decision owner for tie-breakers defined (CTO)
- [ ] Escalation rule confirmed (CEO decision within 24h when compensation or risk conflict blocks offer)

## 8) Feedback template (copy per candidate)
```text
Candidate:
Date:
Interviewer:
Stage:

Scores:
- System design and architecture (25):
- Hands-on coding quality (25):
- Reliability/security ownership (20):
- Product and business alignment (15):
- Collaboration and leadership (15):
Total:

Evidence:
- Strengths:
- Concerns:
- Reliability/security specifics:

Recommendation:
- Strong hire / Hire with caveats / No hire
- Rationale:
- Risks and mitigation (if applicable):
```
