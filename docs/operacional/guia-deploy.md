# Guia de Deploy — TicketBR

Guia operacional de build, deploy e validação pós-deploy do TicketBR.
Complementa a baseline de governança em [`docs/architecture/tic-24-devops-governance-gates.md`](../architecture/tic-24-devops-governance-gates.md) (gates, SLOs e matriz de risco).

## 1. Visão geral

- **Aplicação**: Next.js 16 (App Router) + React 19 + TypeScript, pacote único (frontend + rotas de API).
- **Banco**: PostgreSQL via Prisma 7 (`DATABASE_URL`).
- **Hospedagem**: Vercel (build + runtime serverless + Cron Jobs).
- **Node no CI**: 20.
- **Fluxo**: PR → CI/Security verdes → merge na `main` (protegida) → deploy automático no Vercel.

## 2. Pré-requisitos

- Acesso ao projeto no Vercel (Production e Preview).
- Acesso de escrita ao banco de produção (`DATABASE_URL` de produção, idealmente via pooled connection string).
- Permissão para configurar variáveis de ambiente no Vercel.
- `CRON_SECRET` definido para proteger os endpoints de cron.

## 3. Variáveis de ambiente

Definidas no Vercel (Production/Preview) e localmente em `.env`. Referência: [`.env.example`](../../.env.example).

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Connection string do PostgreSQL usada pelo Prisma. |
| `JWT_SECRET` | Sim | Segredo de assinatura dos tokens de sessão. Sem ele, rotas protegidas retornam 503 (API) ou redirecionam para login (UI). |
| `APP_BASE_URL` | Recomendada | URL base usada nos links de notificação por e-mail. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Recomendadas | Habilitam o envio de e-mails de notificação. |
| `SLA_WARNING_HOURS` | Recomendada | Janela (horas) do alerta de SLA próximo do vencimento (padrão 4). |
| `CRON_SECRET` | Sim (se usar cron) | Segredo enviado pelo scheduler nos endpoints `/api/cron/*`. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Recomendadas | Habilita rate-limit distribuído em produção. |
| `RATE_LIMIT_KEY_PREFIX` | Opcional | Prefixo das chaves de rate-limit. |
| `LOGIN_MAX_FAILURES` | Opcional | Falhas de credencial antes do bloqueio progressivo da conta (padrão 5). |
| `LOGIN_FAILURE_WINDOW_MINUTES` | Opcional | Janela (minutos) de contagem das falhas de login (padrão 15). |
| `LOGIN_LOCK_STEPS_MINUTES` | Opcional | Duração crescente do bloqueio de login, em minutos (padrão `1,5,15,60`). |
| `WEBHOOK_LOG_MAX_ENTRIES` | Opcional | Número máximo de logs de webhook mantidos no banco (padrão 500; os mais antigos são removidos). |
| `CORS_ALLOW_ORIGIN` | Opcional | Origem permitida no header `Access-Control-Allow-Origin`. |

Flags de build (opcionais, lidas no `postbuild`):

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `RUN_DB_MIGRATE_ON_BUILD` | `false` | Quando `true`, executa `prisma migrate deploy` no fim do build. |
| `RUN_DB_MIGRATE_STRICT` | `false` | Quando `false`, falha de migração no build **não** aborta o deploy. |
| `RUN_DB_MIGRATE_RETRIES` | `4` | Tentativas de migração em caso de timeout de advisory lock. |
| `RUN_DB_MIGRATE_RETRY_DELAY_MS` | `3000` | Intervalo entre tentativas de migração. |
| `RUN_SEED` | `false` | Quando `true`, o `db:deploy` executa o seed após migrar. |

## 4. Pipeline de CI

Arquivo: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — job `validate` (rodando em PR e push em `main`/`master`):

1. `npm ci`
2. `npm run prisma:validate`
3. `npm run prisma:generate`
4. `npm run lint`
5. `npm run typecheck`
6. `npm test`
7. `npm run test:contract`
8. `npm run build`

Arquivo: [`.github/workflows/security.yml`](../../.github/workflows/security.yml):

- `dependency-audit`: `npm audit --omit=dev --audit-level=high` (bloqueia se houver vulnerabilidade alta/crítica em dependências de produção).
- `CodeQL Analyze`: análise estática de segurança (também semanal, segunda 08:00).

A branch `main` é protegida e exige aprovação dos status checks (CI, CodeQL, dependency-audit) via Pull Request.

## 5. Build local

```bash
npm ci
npm run prisma:generate
npm run build
```

O `postbuild` ([`scripts/postbuild.cjs`](../../scripts/postbuild.cjs)) **não** executa migrations por padrão e imprime:

```
[postbuild] Skipping DB migration. Set RUN_DB_MIGRATE_ON_BUILD=true to enable.
```

## 6. Migrations de banco

- **Aplicar migrations (produção/manual)**: `npm run db:migrate` → executa `prisma migrate deploy` ([`scripts/db-migrate.cjs`](../../scripts/db-migrate.cjs)).
  - Fallback automático para o Prisma local quando o CLI global não está disponível.
  - Se detectar banco existente sem baseline (`P3005`), **continua sem aplicar** alterações e emite aviso, evitando conflito de objetos.
- **Migrar + seed (opcional)**: `npm run db:deploy` (= `db:migrate` + `db:seed` quando `RUN_SEED=true`).
- **Desenvolvimento**: `npm run prisma:migrate` (`prisma migrate dev`) ou `npm run db:push` (`prisma db push`).
- **Seed**: `npm run seed` ou `npm run db:seed`.

> Regra prática: nunca rode migration destrutiva sem um backup verificado. Ver [backup-restore.md](./backup-restore.md).

## 7. Cron Jobs (Vercel)

Definidos em [`vercel.json`](../../vercel.json):

| Path | Schedule | Descrição |
| --- | --- | --- |
| `/api/cron/sla-scan` | `0 12 * * *` (diário 12:00 UTC) | Varredura de SLA (próximo/estourado) e disparo de notificações. |
| `/api/cron/kpi-snapshot` | `30 12 * * *` (diário 12:30 UTC) | Captura do snapshot diário de KPIs gerenciais. |

Atenção:

- **Plano Hobby do Vercel só permite cron diário.** Expressões horárias (ex.: `0 * * * *`) fazem o deploy falhar.
- Os endpoints validam `Authorization: Bearer $CRON_SECRET` ou o header `x-cron-secret`; sem segredo válido, exigem sessão de administrador.

## 8. Deploy

**Produção (fluxo padrão)**

1. Abrir PR da feature/fix para `main`.
2. Aguardar checks verdes (`validate`, `CodeQL Analyze`, `dependency-audit`, `Vercel`).
3. Merge (squash) na `main`.
4. O Vercel faz o deploy de produção do commit de merge.
5. Executar a validação pós-deploy (seção 9).

**Deploy de migration junto ao build (opcional)**

Definir `RUN_DB_MIGRATE_ON_BUILD=true` no ambiente do Vercel para que o `postbuild` aplique as migrations. Em mudanças de schema de alto risco, preferir aplicar `npm run db:migrate` de forma controlada antes/independente do build.

**Preview/Staging**

Cada PR gera um deploy de Preview no Vercel. Use a URL de preview para smoke tests antes de promover para produção.

## 9. Validação pós-deploy

1. `GET /api/health` deve retornar **200** com `env.missing: []` e `dependencies.database.status: "up"`. Retorno `503`/`degraded` indica banco indisponível ou env faltando.
2. `GET /api/tickets` sem cookie deve retornar **401** (prova que a autorização está ativa).
3. Smoke de fluxos críticos (contra a URL de preview ou produção):

```bash
BASE_URL=https://<url-do-deploy> npx tsx scripts/test-integration.ts
```

4. Verificar logs do runtime e métricas de observabilidade (`/api/observability/metrics`) na janela inicial.

## 10. Rollback

**Aplicação**

- No Vercel, usar **Instant Rollback** ou promover um deployment anterior estável para Production.
- Revalidar `/api/health` e os fluxos críticos após o rollback.

**Banco (migrations)**

- Migrations já aplicadas **não** são revertidas automaticamente pelo rollback da aplicação.
- Preferir migrations compatíveis para frente (aditivas) para permitir rollback de código sem rollback de schema.
- Se for indispensável reverter dados/schema, restaurar a partir do backup conforme [backup-restore.md](./backup-restore.md) e a estratégia de dados do TIC-21.

Procedimento completo de rollback e gates: seção "Deploy and rollback runbook" do TIC-24.

## 11. Checklist de deploy

- [ ] Variáveis de ambiente conferidas no Vercel (`DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`).
- [ ] CI + Security verdes no PR.
- [ ] `vercel.json` com crons em frequência permitida pelo plano.
- [ ] Migration de alto risco com backup verificado.
- [ ] `GET /api/health` retornando 200 e `env.missing: []`.
- [ ] Smoke dos fluxos críticos executado.
- [ ] Plano de rollback definido.
