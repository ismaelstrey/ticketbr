# Chat architecture and AI evolution guide

## Purpose

This document describes the current chat integration architecture, the canonical boundaries introduced in the latest refactor, and how future AI-enabled features should evolve without coupling business rules to a specific provider.

## Current design principles

### 1. Canonical provider resolution

Provider selection must go through `src/server/services/chat-provider.ts`.

Why:
- avoids repeating `if/else` trees for `n8n`, `evolution`, and `uazapi`;
- makes future providers additive instead of invasive;
- gives AI-assisted code changes one stable place to update provider rules.

Core functions:
- `getAvailableWhatsAppProviders(config)`
- `resolveWhatsAppProvider(config, fallbackOrder)`
- `assertProviderConfigured(provider, config)`

### 2. Canonical inbound normalization

Inbound webhook payloads must be normalized before business logic runs.

Normalization entrypoint:
- `src/server/services/chat-inbound-normalizer.ts`

Execution entrypoint after normalization:
- `src/server/services/chat-inbound-processing.ts`

Together these files convert raw webhook payloads into one of three canonical outcomes and then execute the shared inbound workflow:
- `message`
- `message_update`
- `ignored`

The goal is that routes stay thin and `ChatService` only receives internal payloads.

### 3. Thin routes, thicker services

Routes should only:
- parse HTTP input;
- resolve runtime config;
- call the relevant service/use-case;
- map result to HTTP response.

Routes should not:
- know provider-specific payload internals;
- duplicate provider fallback logic;
- contain long business workflows.

## AI-oriented evolution rules

### Rule A — Keep provider-specific logic out of the AI layer

Any future AI orchestrator should operate on internal models such as:
- conversation context;
- normalized inbound message;
- ticket context;
- action plan.

It should never consume raw `UAZAPI`, `Evolution`, or `n8n` payloads directly.

### Rule B — Introduce AI behind an application boundary

Recommended next step:
- create `src/server/services/ai-orchestrator.ts` or an application-layer use case;
- receive canonical message + conversation context;
- return structured actions, not free-form side effects.

Suggested output format:
- `handoffRequired`
- `reason`
- `suggestedReply`
- `toolCalls`
- `confidence`

### Rule C — Build a conversation context service before adding LLM calls

Before calling an LLM, create a dedicated context builder that aggregates:
- customer/contact identity;
- company/requester;
- open tickets;
- recent messages;
- conversation mode (`bot`, `human`, `hybrid`);
- SLA or urgency markers.

### Rule D — Prefer explicit tools over hidden side effects

If AI needs to update the system, expose explicit tools/use-cases such as:
- `linkContactToTicket`
- `createTicket`
- `updateTicketStatus`
- `sendWhatsAppReply`
- `escalateToHuman`

This improves auditability and keeps AI behavior deterministic.

## Safe extension checklist for future contributors or AI agents

When adding a new provider:
1. Add transport/client logic in a provider-specific adapter.
2. Add canonical mapping/normalization.
3. Update `chat-provider.ts`.
4. Reuse canonical internal types instead of exposing raw provider payloads.
5. Add focused tests for provider resolution and normalization.

When adding AI features:
1. Do not add LLM calls inside Next.js route handlers.
2. Do not parse provider payloads inside AI code.
3. Reuse `normalizeInboundPayload` output.
4. Build context explicitly from repositories/services.
5. Record AI decisions in a persistent audit trail.

## Recommended next refactors

1. Extract a conversation context builder.
2. Split `ChatService` into orchestration + repositories + policy engine.
3. Persist webhook/audit logs instead of keeping them only in memory.
4. Replace legacy ticket text fallbacks with consistent relational reads.
5. Introduce a tool-driven AI orchestration layer.
