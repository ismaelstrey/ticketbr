# TIC-5 - Delivery Quality Gates Baseline (tests, security, observability)

## Objective

Activate a minimum and auditable quality baseline for engineering delivery with three non-negotiable gates:
- test/build gates for every PR and push to protected branches;
- automated dependency and static security scan;
- observability baseline with SLI/SLO and operational alert ownership.

## Baseline activated in this cycle

### 1) CI required checks (tests/build)

Workflow: `.github/workflows/ci.yml`

Blocking checks:
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run lint` (TypeScript noEmit)
- `npm test`
- `npm run test:contract`
- `npm run build`

Expected branch protection required checks:
- `CI / validate`
- `Security / dependency-audit`
- `Security / CodeQL Analyze`

### 2) Security gate baseline

Workflow: `.github/workflows/security.yml`

Automated checks:
- Dependency vulnerability scan: `npm audit --omit=dev --audit-level=high`
- Static analysis: CodeQL (`javascript-typescript`)

Cadence:
- Runs on pull requests.
- Runs on push to `main` and `master`.
- Runs weekly via cron (Monday 08:00 UTC) for background drift detection.

Dependency hygiene:
- `.github/dependabot.yml` enables weekly updates for npm and GitHub Actions.

### 3) Observability baseline (delivery-level)

Current instrumentation contract:
- Request correlation: `x-request-id` response header and `requestId` response body.
- Structured route logs with elapsed time and status context.
- Health endpoint (`GET /api/health`) reports dependency latency and degraded mode.

SLIs and SLO targets:
- CI reliability SLI: successful runs / total runs for required checks.
  - SLO: >= 95% weekly pass rate for required checks.
- API health SLI: successful health probes / total probes.
  - SLO: >= 99.5% rolling 30-day success for `GET /api/health`.
- Incident triage SLI: median time from alert open to first triage update.
  - SLO: <= 15 minutes during support hours.

Initial alert policy:
- Alert when health status returns `degraded` for 3 consecutive checks.
- Alert when weekly CI required-check pass rate drops below 95%.
- Alert when repeated `error` route logs exceed baseline threshold (to be tuned by module owner).

## Ownership and operating cadence

- CTO: overall gate policy and go/no-go decision.
- QA: test evidence and gate stability review.
- Security: vulnerability triage and residual risk acceptance.
- DevOps/Platform: workflow availability, branch protection and alert routing.

Weekly ritual:
- Publish gate dashboard summary: `PASS|FAIL|PARTIAL|BLOCKED`.
- Track top failing checks, MTTD/MTTR indicators and open security findings.
- Record remediation owner and deadline for each failing gate.

## Definition of done for TIC-5

- CI workflow running as required checks with tests/build coverage.
- Security workflow active with dependency scan and static code analysis.
- Dependabot active for dependency hygiene.
- Observability/SLO baseline documented with explicit alert policy and owners.
