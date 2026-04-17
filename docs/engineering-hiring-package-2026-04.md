# Engineering Hiring Package (TicketBR)

Prepared by: CTO  
Date: April 16, 2026  
Deadline reference: April 23, 2026

## 1) 90-Day Engineering Hiring Plan

### Objective
Build a compact, high-leverage engineering team that can stabilize core product reliability, increase delivery throughput, and support revenue-critical features without over-hiring.

### Hiring Sequence (90 days)

| Window | Role | Why now | Expected outcome by end of window |
|---|---|---|---|
| Days 1-30 | Founding Full-Stack Engineer | Immediate force multiplier for backlog burn + architecture hardening | +25-35% feature throughput, improved code ownership on core flows |
| Days 31-60 | Senior Backend/Platform Engineer | Reliability, observability, queueing, and incident response maturity | Reduced production incident frequency and faster MTTR |
| Days 61-90 | QA Automation Engineer (SDET profile) | Move from reactive testing to preventive quality gates | Regression coverage for critical user journeys and release confidence |

### Role Deliverables

#### Founding Full-Stack Engineer (Days 1-30 start)
- Co-own architecture and code review standards with CTO.
- Deliver 1-2 high-priority roadmap features from backlog to production.
- Improve developer experience: local setup, CI time, and test stability.

#### Senior Backend/Platform Engineer (Days 31-60 start)
- Implement production reliability guardrails (alerts, SLO dashboards, runbooks).
- Improve async processing resilience (retry/idempotency patterns).
- Lead one reliability initiative that removes a top recurring operational risk.

#### QA Automation Engineer (Days 61-90 start)
- Define risk-based test pyramid for API + UI + integration.
- Automate smoke and regression suites for key ticket/chat workflows.
- Add quality gates to CI/CD and enforce merge criteria.

## 2) Founding Engineer Profile + Evaluation Scorecard

### Founding Engineer Profile
- Seniority: 6+ years in startup or high-ambiguity product teams.
- Scope: full-stack delivery, architecture participation, reliability mindset.
- Traits:
  - Executes with high autonomy and low process overhead.
  - Strong debugging and production incident handling.
  - Pragmatic quality ownership (tests, observability, rollback safety).
  - Product judgment: can prioritize impact over technical novelty.

### Evaluation Scorecard (100 points)

| Dimension | Weight | Evidence expected |
|---|---:|---|
| System design and architecture | 25 | Tradeoff reasoning, scalability, failure handling |
| Hands-on coding quality | 25 | Clean code, tests, refactor judgment, delivery speed |
| Reliability/security ownership | 20 | Threat modeling basics, incident patterns, safe defaults |
| Product and business alignment | 15 | Prioritization, user impact reasoning, KPI orientation |
| Collaboration and leadership | 15 | Clear communication, mentorship potential, ownership behavior |

### Hiring Thresholds
- Strong hire: >= 80 total and >= 15/20 in reliability/security.
- Hire with caveats: 70-79 only if architecture + coding are both strong and risk area has explicit mitigation plan.
- No hire: < 70 or any critical red flag in ownership/integrity.

## 3) Interview Loop Design (with Quality/Security Checks)

### Stage 1: Recruiter/CTO Screen (30-40 min)
- Validate trajectory, startup-fit, and motivation.
- Hard filter: ownership mentality, bias to ship safely.

### Stage 2: Technical Deep Dive (60 min)
- Architecture discussion from real TicketBR context.
- Evaluate: decomposition, data flow, failure modes, observability strategy.

### Stage 3: Pair Programming (75 min)
- Implement a scoped feature/fix with tests.
- Evaluate: coding pragmatism, communication, test choices, iteration speed.

### Stage 4: Reliability + Security Scenario (45 min)
- Incident simulation: degraded external dependency, retries, data consistency.
- Security checks: auth boundaries, secret handling, input validation, abuse/rate limit awareness.

### Stage 5: Founder/Leadership Fit (30 min)
- CEO + CTO alignment on accountability, pace, and ambiguity handling.

### Decision Rules
- Use structured rubrics per stage; no unstructured "gut-only" decisions.
- Require explicit written signal for quality/security from Stage 4.
- Debrief within 24 hours with final recommendation and risk note.

## 4) Recommended Hiring Timeline + Risk/Capacity Tradeoffs

### Timeline
- Week of April 20, 2026: launch founding engineer search + outbound.
- Week of April 27, 2026: begin first interview loops.
- Week of May 4, 2026: target offer to top founding engineer candidate.
- Week of May 18, 2026: onboarding target (best-case).
- June 2026: open Senior Backend/Platform role based on onboarding stability.
- Late June/July 2026: open QA Automation role after baseline test strategy is defined.

### Capacity/Risk Tradeoffs

| Option | Benefit | Risk | Recommendation |
|---|---|---|---|
| Hire founding engineer first | Fastest throughput increase with broad scope | Higher variance if profile fit is weak | Strongly recommended |
| Hire backend/platform before founding full-stack | Reliability uplift earlier | Product feature velocity may lag | Use only if incidents spike materially |
| Hire QA before platform role | Earlier test automation | Core architecture debt may persist | Sequence QA third as baseline |
| Hire all three in parallel | Faster team build | Onboarding overhead, hiring quality drop | Avoid unless roadmap pressure becomes critical |

### Mitigations
- Keep interview bar high to avoid expensive early mis-hire.
- Use 30/60-day onboarding checkpoints with explicit success criteria.
- Preserve CTO review gate for production-risking changes until platform maturity improves.

## 5) Success Metrics for the 90-Day Plan

- Time-to-hire (Founding Engineer): <= 6 weeks from kickoff.
- Throughput: +25% completed roadmap items per sprint by 60 days post-hire.
- Reliability: measurable drop in high-severity incidents within 90 days.
- Quality: >= 80% automated coverage on critical ticket/chat journeys by end of QA ramp.

