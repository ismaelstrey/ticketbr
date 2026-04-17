# TIC-8 N+1.1/N+1.2 Implementation Spec (Context Rail + SLA/Priority Chips)

Date: 2026-04-17  
Owner: CTO  
Parent: TIC-8.1 + TIC-8.2

## 1) Goal
Implement a unified ticket context rail and normalized SLA/priority chips across ticketing, kanban, and chat surfaces without changing SLA business rules.

## 2) Current Code Reality (Mapped)
- Kanban card currently renders priority badge and SLA label/progress:
  - `src/components/kanban/TicketCard.tsx`
- Ticket details expose status and SLA response/solution fields:
  - `src/components/ticket/TicketDetails.tsx`
- Chat header currently lacks shared ticket context metadata:
  - `src/app/chat/page.tsx`
- Ticket API contract uses `mapTicket` in service layer:
  - `src/server/services/ticket-service.ts`

## 3) Technical Scope by File

### 3.1 Shared Domain Contract (new/updated)
- `src/types/ticket.ts`
- Add `TicketContextRail` type:
  - `ticketId`, `ticketNumber`, `subject`, `requester`, `company`, `status`, `priority`, `slaProgress`, `slaTone`, `latestEventAt`
- Add optional `contextRail?: TicketContextRail` on `Ticket`.

- `src/lib/tickets/sla-chip.ts` (new)
- Add normalization helpers:
  - `getSlaToneFromProgress(progress: number): "safe" | "warning" | "danger" | "breach"`
  - `getSlaChipLabel(tone)`
  - `getPriorityChipLabel(priority)`
- Single source for chip text/tone mapping.

### 3.2 Server Contract
- `src/server/services/ticket-service.ts`
- Populate `contextRail` in `mapTicket` using already available fields.
- Set `latestEventAt` from newest roadmap/event timestamp.
- Keep existing SLA math untouched (no rule changes).

### 3.3 UI Surfaces
- `src/components/kanban/TicketCard.tsx`
- Replace local SLA label logic with shared `sla-chip` helpers.
- Render normalized priority + SLA chips from `contextRail` fallbacking to existing ticket fields.

- `src/components/ticket/TicketDetails.tsx`
- Render top context rail block with canonical fields.
- Reuse same chip tone/token source used in Kanban card.

- `src/app/chat/page.tsx`
- Add header context rail when a ticket is selected in `ChatConversationFooter`.
- Display ticket number, subject, priority chip, SLA chip in chat header.

## 4) Rollout Sequence
1. Implement shared types/util (`ticket.ts`, `sla-chip.ts`).
2. Wire server contract (`ticket-service.ts`).
3. Update Kanban and Ticket details rendering.
4. Update Chat header rendering.
5. Run gates and capture evidence.

## 5) Acceptance Criteria (Technical)
1. Same SLA tone/label mapping is used across kanban, ticket details, and chat.
2. Same priority label semantics across the three surfaces.
3. Selected ticket context in chat header is consistent with ticket API data.
4. No changes in SLA calculation behavior.
5. Typecheck, build, and targeted tests are green.

## 6) Targeted Tests
- `src/lib/tickets/sla-chip.test.ts` (new)
- Tone mapping boundaries: `0-69`, `70-89`, `90-100`, `>100`.
- Priority label mapping for `Alta`, `Média`, `Sem prioridade`.

- `src/components/kanban/TicketCard` test (new or existing extension)
- Ensures chip labels match shared mapping.

- `src/app/chat/page.tsx` test (new scoped test)
- Ensures context rail appears when a selected ticket exists.

## 7) Mandatory Gates for This Slice
1. `npm run lint`
2. `npx vitest run src/lib/tickets/sla-chip.test.ts`
3. `npx vitest run src/components/kanban/KanbanBoard.navigation.test.tsx`
4. `npm run build`

## 8) Risks and Mitigations
- Risk: duplicated chip semantics reintroduced in local components.
  - Mitigation: mandatory import from `src/lib/tickets/sla-chip.ts`; no inline mapping allowed.
- Risk: chat header context drifts from API contract.
  - Mitigation: use ticket object from same server mapping and typed `contextRail`.
- Risk: visual regressions on smaller screens.
  - Mitigation: responsive checks in kanban card and chat header with lightweight layout tests.
