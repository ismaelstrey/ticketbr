# TIC-6 - Contrato Canonico de Eventos Ticket/Chat

## Objetivo

Definir um contrato unico, versionado e validado em runtime para eventos de dominio Ticket/Chat emitidos pelo TicketBR para integracoes externas (ex.: n8n), reduzindo drift de payload e risco de regressao.

## Escopo v1 (`schemaVersion = 1.0.0`)

Eventos cobertos na taxonomia inicial:

- `chat.message.received`
- `chat.ticket.linked`
- `ticket.created`
- `ticket.status.changed`

Implementacao tecnica:

- Schema e builders: `src/server/contracts/ticket-chat-events.ts`
- Emissores integrados nesta etapa:
  - `src/server/services/chat-inbound-processing.ts` (`chat.message.received`)
  - `src/app/api/chat/links/route.ts` (`chat.ticket.linked`)

## Envelope Canonico

Todos os eventos devem obedecer ao envelope:

- `eventId` (UUID, obrigatorio)
- `schemaVersion` (`1.0.0`, obrigatorio)
- `type` (enum de eventos, obrigatorio)
- `source` (`ticketbr-chat | ticketbr-ticket`, obrigatorio)
- `occurredAt` (ISO-8601 com timezone, obrigatorio)
- `correlation` (opcional)
  - `requestId`, `ticketId`, `conversationId`, `waChatId`, `waMessageId`
- `actor` (opcional)
  - `type`: `system | user | customer | integration`
  - `id`, `name`
- `data` (obrigatorio, schema dependente de `type`)

## Contratos por Evento (v1)

### `chat.message.received`

Campos principais de `data`:

- `provider`, `mode`, `event`, `instance`
- `waChatId`, `waMessageId`, `fromMe`, `pushName`, `timestamp`
- `message.type`, `message.text`, `message.caption`, `message.media`
- `raw` (payload original normalizado)

### `chat.ticket.linked`

Campos obrigatorios de `data`:

- `ticketId`
- `contactId`
- `channel` (`whatsapp | email`)
- `conversationId`

### `ticket.created`

Campos obrigatorios de `data`:

- `ticketId`
- `ticketNumber`
- `status` (`TODO | DOING | PAUSED | DONE`)
- `subject`

Campos opcionais:

- `priority`
- `company`

### `ticket.status.changed`

Campos obrigatorios de `data`:

- `ticketId`
- `toStatus` (`TODO | DOING | PAUSED | DONE`)

Campos opcionais:

- `fromStatus`
- `pauseReason`
- `pauseSla`

## Compatibilidade com Webhook Atual

Para nao quebrar consumidores existentes, o dispatch para n8n preserva os campos legacy:

- `type`
- `source`
- `occurredAt`
- `data`

E adiciona metadados canonicos:

- `schemaVersion`
- `eventId`
- `correlation` (quando houver)
- `actor` (quando houver)

## Gates de Qualidade Aplicados

- Validacao de schema via Zod no ponto de emissao.
- Testes de contrato:
  - `src/server/contracts/ticket-chat-events.test.ts`
  - cenario valido de cada emissor implementado;
  - cenario invalido com rejeicao de payload.

## Limites e Evolucao

- `schemaVersion` nao pode ser alterado sem changelog e teste de compatibilidade.
- Novos eventos devem entrar via enum tipado + schema dedicado + teste.
- Remocao/renomeacao de campo obrigatorio exige estrategia de transicao (expand/contract).

