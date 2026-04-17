# TIC-10: Portal Status Taxonomy + Copy Map (Final)

Date: 2026-04-16  
Owner: UXDesigner  
Dependency target: TIC-8 N+1.4 / N+2.2

## 1) Scope and decision
This document freezes the customer-facing status taxonomy and copy map for the portal flow so implementation teams can wire API/UI/telemetry without wording drift.

Decision:
- Internal ticket states remain unchanged (`TODO`, `DOING`, `PAUSED`, `DONE`).
- Portal uses semantic taxonomy keys that are stable for analytics and copy versioning.
- UI copy must be derived from this map only.

## 2) Taxonomy mapping (source of truth)

| Internal status | Portal taxonomy key | Portal label | Tone |
| --- | --- | --- | --- |
| `TODO` | `REQUEST_RECEIVED` | `Solicitação recebida` | `info` |
| `DOING` | `IN_PROGRESS` | `Em atendimento` | `info` |
| `PAUSED` | `WAITING_CUSTOMER_ACTION` | `Aguardando sua ação` | `warning` |
| `DONE` | `RESOLVED` | `Concluído` | `success` |

Determinism rule:
- Every internal status in scope maps to exactly one taxonomy key.
- No portal surface may show raw internal values.

## 3) Copy map

### `REQUEST_RECEIVED`
- Label: `Solicitação recebida`
- Timeline title: `Recebemos sua solicitação`
- Description: `Seu ticket foi aberto e está na fila para triagem inicial.`
- Next action hint: `Você será avisado quando um atendente iniciar a análise.`

### `IN_PROGRESS`
- Label: `Em atendimento`
- Timeline title: `Estamos trabalhando no seu ticket`
- Description: `Um atendente está analisando e tratando a sua solicitação.`
- Next action hint: `Se precisar complementar, responda no histórico do ticket.`

### `WAITING_CUSTOMER_ACTION`
- Label: `Aguardando sua ação`
- Timeline title: `Precisamos de uma confirmação sua`
- Description: `O atendimento foi pausado até recebermos informações complementares.`
- Next action hint: `Envie os dados solicitados para retomarmos o atendimento.`

### `RESOLVED`
- Label: `Concluído`
- Timeline title: `Ticket concluído`
- Description: `Sua solicitação foi finalizada com sucesso.`
- Next action hint: `Se necessário, você pode abrir um novo ticket.`

## 4) Integration contract
- Runtime contract: `src/lib/tickets/portal-status-taxonomy.ts`
- API exposure:
- `/api/customer/tickets`
- `/api/customer/tickets/[id]`
- UI consumers:
- `src/app/cliente/page.tsx`
- `src/app/cliente/tickets/[id]/page.tsx`
- `src/components/dashboard/charts/StatusDonut.tsx`

## 5) Acceptance criteria (TIC-10 exit)
1. Internal status values in scope are fully covered by taxonomy mapping.
2. Portal list/detail views render mapped labels from shared contract.
3. Dashboard status labels use shared mapping.
4. API returns taxonomy key + copy payload for portal consumers.
5. No fallback text is required for covered statuses.

