# Runbook de Incidentes — TicketBR

Procedimentos de resposta a incidentes operacionais do TicketBR.
Objetivo: reduzir o MTTR com triagem objetiva e ações reproduzíveis.

Base de referência: [`docs/architecture/tic-24-devops-governance-gates.md`](../architecture/tic-24-devops-governance-gates.md) (SLOs e política de severidade).

## 1. Severidades e SLOs

| Sev | Gatilho | Resposta |
| --- | --- | --- |
| **SEV-1** | API crítica indisponível; disponibilidade < 98% em 5 min; banco fora do ar | Acionamento imediato DevOps + Backend + CTO |
| **SEV-2** | p95 > 800ms por 15 min; 5xx > 2% por 10 min; falha de webhook/integração > 5% por 10 min | DevOps + owner do módulo em até 15 min |

SLOs: disponibilidade ≥ 99.5%/30d, p95 ≤ 800ms, 5xx < 1% por endpoint crítico.

## 2. Triagem inicial (sempre)

1. Confirmar o sintoma e o horário de início.
2. Verificar o healthcheck:

   ```bash
   curl -s https://<seu-dominio>/api/health
   ```

   - `status: "ok"` + `dependencies.database.status: "up"` → investigar por rota/módulo.
   - `status: "degraded"` ou HTTP **503** → banco indisponível ou env faltando (ver `env.missing`).
3. Coletar o `x-request-id` de uma requisição com erro — ele correlaciona os logs estruturados da rota.
4. Consultar métricas: `GET /api/observability/metrics` (requer sessão) para latência, taxa de erro e volume por rota.
5. Classificar a severidade e abrir comunicação (seção 6).
6. Registrar uma linha do tempo do incidente (ações + horários) para o postmortem.

## 3. Playbooks

### INC-1 — API indisponível / 5xx em massa

1. Verificar `GET /api/health`. Se 503 → ir para **INC-2** (banco).
2. Verificar status do último deploy no Vercel. Se coincidir com o início do incidente, considerar **rollback** (ver [guia-deploy.md](./guia-deploy.md#10-rollback)).
3. Checar `env.missing` no health para variáveis ausentes.
4. Conferir logs do runtime por `x-request-id`.
5. Se um módulo específico falha (ex.: `/api/tickets`), isolar a rota e seguir o playbook correlato.

### INC-2 — Banco indisponível (HTTP 503 "Banco de dados indisponível")

Sintoma: erros `P1001`, `P1002`, `ECONNREFUSED`, "Can't reach database server" e health `degraded`.

1. Confirmar `DATABASE_URL` no Vercel (host, porta, credenciais, parâmetros de SSL).
2. Verificar no provedor se o banco está no ar, se há manutenção/limite de conexões atingido.
3. Se usar pooler/connection pooling, validar o endpoint pooled e o limite de conexões.
4. Testar conectividade direta:

   ```bash
   psql "$DATABASE_URL" -c "select 1;"
   ```

5. Se o banco está indisponível por falha do provedor, acompanhar o status e comunicar; **não** executar migrations.
6. Restabelecido o banco, revalidar `/api/health` e os fluxos críticos.

### INC-3 — Schema/migration dessincronizado

- `P2021` ("table does not exist" → a rota responde "Banco de dados sem migrations"): a migration não foi aplicada.
  1. Aplicar as migrations: `npm run db:migrate`.
  2. Revalidar a rota afetada e `/api/health`.
- `P3005` (banco existente sem baseline de migrations): o `db:migrate` **não** aplica automaticamente e emite aviso.
  1. Não forçar alterações por cima.
  2. Avaliar baseline controlado (`prisma migrate resolve`) junto ao owner de DB, após backup (ver [backup-restore.md](./backup-restore.md)).
- `P2010` (falha em consulta agregada): verificar índices/consulta do dashboard; usar `debug=1` quando disponível na rota.

> Antes de qualquer migration corretiva em produção, gere um dump (ver backup antes de migration de risco).

### INC-4 — Deploy falha no Vercel

1. Ler o log do build no Vercel.
2. Causas recorrentes:
   - **Cron inválido para o plano**: no plano Hobby, apenas cron **diário** é aceito. Expressões horárias (ex.: `0 * * * *`) derrubam o deploy. Ajustar em [`vercel.json`](../../vercel.json).
   - Migration falhando no build (`RUN_DB_MIGRATE_ON_BUILD=true` + `RUN_DB_MIGRATE_STRICT=true`): corrigir a migration ou relaxar `RUN_DB_MIGRATE_STRICT`.
   - Erro de build/tipagem: reproduzir localmente com `npm run build`.
   - Falha no `npm ci`/`postinstall` (ex.: `prisma generate`).
3. Corrigir, reabrir PR e aguardar checks verdes — a `main` é protegida.

### INC-5 — Sessão/JWT (MIDDLEWARE_INVOCATION_FAILED ou 503 em rotas)

Sintoma: `/api/*` falhando no middleware ou rotas protegidas retornando 503/redirecionando.

1. Verificar se `JWT_SECRET` está definido no ambiente (o health mostra em `env.missing`).
2. Definir/renovar `JWT_SECRET` no Vercel e redeployar.
3. Revalidar `/api/health` (`env.missing: []`) e `GET /api/tickets` sem cookie deve retornar **401**.

### INC-6 — Login bloqueado / rate-limit (HTTP 429)

O login aplica **duas camadas** de proteção, ambas retornando **429** com headers de retry:

- **Por IP** (`loginRateLimiter`): janela fixa de requisições por endereço de origem.
- **Por conta/e-mail** (`loginLockGuard`): bloqueio **progressivo** após falhas de credencial, com duração crescente.

1. Identificar a camada: o bloqueio por conta ocorre mesmo quando a senha está correta (o `X-RateLimit-*` ainda permite) — a conta está temporariamente bloqueada.
2. Ajustar limites por ambiente, se necessário: `LOGIN_MAX_FAILURES` (falhas antes de bloquear, padrão `5`), `LOGIN_FAILURE_WINDOW_MINUTES` (janela de contagem, padrão `15`) e `LOGIN_LOCK_STEPS_MINUTES` (duração crescente do bloqueio em minutos, padrão `1,5,15,60`).
3. Verificar configuração do rate-limit distribuído (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). Sem eles, o rate-limit cai para modo permissivo por instância (memória), o que também limita o bloqueio progressivo à instância que atendeu a requisição.
4. Confirmar se o bloqueio é por tentativas legítimas ou por ataque; se necessário, investigar a origem (`x-forwarded-for`).
5. Aguardar a janela de retry (o header `Retry-After` indica os segundos) ou resetar a chave no store, conforme política. Um login bem-sucedido limpa automaticamente as falhas e o bloqueio da conta.

### INC-7 — WhatsApp / Chat (Evolution, UAZAPI, n8n)

1. Verificar o provedor ativo em **Configurações → WhatsApp**.
2. Conferir status/token da instância (UAZAPI) ou da instância Evolution.
3. Validar o webhook de entrada: `POST /api/chat/webhook/uazapi` (e rotas dinâmicas `/api/chat/webhook/uazapi/...`).
4. Consultar logs de webhook: `GET /api/settings/webhook-logs`.
5. Causa comum de **loop/duplicação**: webhook sem `excludeMessages: ["wasSentByApi"]`. Guia: [docs/integrations/uazapi](../../src/app/docs/integrations/uazapi/page.tsx) — configuração detalhada.
6. Testar bidirecionalidade: enviar do painel e pedir resposta do cliente.

### INC-8 — Cron não executa (SLA scan / KPI snapshot)

Sintomas: notificações de SLA não disparam; snapshots de KPI não são gravados.

1. Confirmar que `CRON_SECRET` está definido e igual ao configurado no scheduler.
2. Verificar o schedule em [`vercel.json`](../../vercel.json) (precisa ser diário no plano Hobby).
3. Testar o endpoint manualmente:

   ```bash
   curl -s -H "Authorization: Bearer $CRON_SECRET" https://<seu-dominio>/api/cron/sla-scan
   curl -s -H "Authorization: Bearer $CRON_SECRET" https://<seu-dominio>/api/cron/kpi-snapshot
   ```

   Sem `CRON_SECRET`, os endpoints aceitam sessão de administrador.
4. Se um workflow agendado do GitHub parar sem motivo aparente, verificar `disabled_inactivity` (workflows com `schedule` são desativados após 60 dias de inatividade e precisam ser reativados manualmente).

### INC-9 — Notificações (in-app/e-mail) não chegam

1. **E-mail**: validar as variáveis SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). Sem host/remetente, o envio é desabilitado.
2. **In-app**: verificar `GET /api/notifications` com sessão válida (lista + `unreadCount`).
3. **Duplicidade ausente**: os disparos usam `dedupeKey` para idempotência; se uma notificação esperada não aparecer, confirmar se a chave não foi bloqueada por um disparo anterior do mesmo evento.
4. Conferir se o evento de origem ocorreu (mudança de status, comentário, atribuição, alerta de SLA) e se a varredura de SLA depende do cron (INC-8).

## 4. Comandos úteis

```bash
# Healthcheck
curl -s https://<seu-dominio>/api/health

# Migrations
npm run db:migrate

# Smoke de fluxos críticos (preview ou produção)
BASE_URL=https://<url> npx tsx scripts/test-integration.ts

# Crons (com segredo)
curl -s -H "Authorization: Bearer $CRON_SECRET" https://<seu-dominio>/api/cron/sla-scan
curl -s -H "Authorization: Bearer $CRON_SECRET" https://<seu-dominio>/api/cron/kpi-snapshot
```

## 5. Diagnóstico por código de erro (Prisma)

| Código | Significado | Ação |
| --- | --- | --- |
| `P1001` / `P1002` | Não é possível alcançar o banco / timeout | INC-2 |
| `P2010` | Falha em consulta raw/agregada | Revisar consulta/índices; `debug=1` quando disponível |
| `P2021` | Tabela não existe (migrations ausentes) | INC-3 (`npm run db:migrate`) |
| `P2025` | Registro não encontrado | Comportamento esperado → rota deve retornar 404; investigar só se ocorrer em fluxo válido |
| `P3005` | Banco sem baseline de migrations | INC-3 (baseline controlado + backup) |

## 6. Escalação e comunicação

1. SEV-1: acionar DevOps + Backend + CTO imediatamente.
2. SEV-2: acionar DevOps + owner do módulo em até 15 min.
3. Comunicar status inicial, impacto e próxima atualização em canal combinado; manter cadência durante o incidente.
4. Ao mitigar, atualizar o fluxo e confirmar recuperação via `/api/health` e fluxos críticos.

## 7. Pós-incidente (postmortem)

- Registrar: linha do tempo, causa raiz, impacto, ação de contenção e ação preventiva.
- Abrir item no backlog para a ação preventiva (com owner).
- Atualizar este runbook se o incidente revelou um cenário novo.

## 8. Referências

- [Guia de deploy](./guia-deploy.md)
- [Backup e restore](./backup-restore.md)
- [Baseline de governança DevOps (TIC-24)](../architecture/tic-24-devops-governance-gates.md)
- [Incidente de produção no Vercel (histórico)](../../.trae/documents/incidente-tickets-producao-vercel.md)
