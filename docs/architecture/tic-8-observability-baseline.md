# TIC-8 - Baseline de Observabilidade (health, erro, latencia)

## Contexto

O TicketBR precisava de uma baseline minima e obrigatoria para observabilidade de API:
- health check operacional com dependencias criticas;
- rastreabilidade por request (`requestId`);
- medicao consistente de latencia por endpoint/dependencia;
- logs estruturados para sucesso/falha.

Sem essa baseline, a triagem de incidentes e a governanca de release ficavam dependentes de logs ad-hoc.

## Decisao tecnica

Padrao inicial adotado:

1. Criar utilitario compartilhado em `src/lib/observability.ts` para:
   - gerar `requestId` e contexto temporal do request;
   - calcular latencia (`elapsedMs`);
   - medir execucao de dependencias (`timedCheck`);
   - padronizar logging estruturado (`logRouteEvent`);
   - padronizar resposta HTTP com `x-request-id` (`jsonWithRequestId`).

2. Aplicar a baseline no endpoint `GET /api/health`:
   - status `ok` (200) quando DB responde;
   - status `degraded` (503) quando DB falha;
   - incluir `dependencies.database.latencyMs` real;
   - logar evento com status, latencia de DB e quantidade de variaveis obrigatorias faltando.

3. Cobrir o contrato minimo com teste automatizado:
   - presenca de `x-request-id`;
   - `requestId` no payload;
   - `latencyMs` numerico em cenarios de sucesso e falha.

## Escopo e limites

- Esta baseline e incremental: padrao aplicado primeiro no `health`.
- Nao substitui stack completa de metricas (Prometheus/OpenTelemetry), mas cria contrato minimo para evolucao.
- Nao permite bypass dos gates de tipagem, testes e contrato.

## Impacto esperado

- Reducao de MTTR por correlacao via `requestId`.
- Visibilidade objetiva de degradacao de dependencia critica (DB).
- Fundacao para expandir padrao para endpoints de negocio.

## Evidencias obrigatorias

- `npm run lint`
- `npm run test -- src/app/api/health/route.test.ts`
- `npm run build`
