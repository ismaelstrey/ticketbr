# Incidente: Tickets não abrem/atualizam em Produção (Vercel)

## Sintoma
- Em produção, chamadas para `/api/*` falhavam com:
  - `MIDDLEWARE_INVOCATION_FAILED`
- Isso impedia abertura e atualização de tickets (Kanban e detalhes), além de quebrar `/api/health`.

## Causa Raiz
- O middleware (proxy) dependia de `JWT_SECRET` em runtime.
- A aplicação em produção não tinha variáveis de ambiente configuradas no projeto Vercel.
- O módulo [constants.ts](file:///g:/ticketbr/src/lib/constants.ts) lançava exceção no import quando `JWT_SECRET` não existia, derrubando o middleware inteiro.

## Correções Implementadas
- Tornado o carregamento do JWT resiliente:
  - [constants.ts](file:///g:/ticketbr/src/lib/constants.ts): `getJwtSecret()`/`getJwtKey()` retornam `null` quando ausente (sem crash no import).
  - [auth.ts](file:///g:/ticketbr/src/lib/auth.ts): falha controlada somente quando necessário (ex.: login/sign).
  - [proxy.ts](file:///g:/ticketbr/src/proxy.ts): quando `JWT_SECRET` está ausente, rotas protegidas retornam `503` (API) ou redirecionam para login (UI), evitando outage total.
- Healthcheck com diagnóstico de ambiente:
  - [health route](file:///g:/ticketbr/src/app/api/health/route.ts) agora expõe `env.missing` e `x-request-id`.
- Logs e validações robustas nos endpoints críticos de tickets:
  - [tickets route](file:///g:/ticketbr/src/app/api/tickets/route.ts)
  - [ticket by id](file:///g:/ticketbr/src/app/api/tickets/%5Bid%5D/route.ts)
  - [ticket status](file:///g:/ticketbr/src/app/api/tickets/%5Bid%5D/status/route.ts)
  - Todos retornam `x-request-id` e registram tempo de execução e falhas.

## Configuração Obrigatória no Vercel
- Definir no projeto Vercel (Production):
  - `DATABASE_URL`
  - `JWT_SECRET`
- Validação recomendada após deploy:
  - `GET /api/health` deve retornar `200` e `env.missing: []`.
  - `GET /api/tickets` sem cookie deve retornar `401`.

## Testes
- Teste automatizado para misconfig do JWT sem quebrar import:
  - [constants.misconfig.test.ts](file:///g:/ticketbr/src/lib/constants.misconfig.test.ts)
- Teste de integração (local ou staging/produção via `BASE_URL`):
  - [test-integration.ts](file:///g:/ticketbr/scripts/test-integration.ts)

## Prevenção (staging antes de produção)
- Fazer deploy em Preview/Staging e executar `BASE_URL=<url-preview> npx tsx scripts/test-integration.ts`.
- Só promover para produção após passar healthcheck + integração.

