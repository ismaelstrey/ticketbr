# Backup e Restore — TicketBR

Política e procedimentos de backup e restauração do banco PostgreSQL do TicketBR.
Escopo: banco de dados transacional (tickets, usuários, notificações, snapshots de KPI, etc.).

## 1. Princípios

- **Todo dado transacional vive no PostgreSQL** acessado via `DATABASE_URL`. Não há estado de negócio relevante fora do banco.
- **Backup gerenciado + backup lógico**: usar a retenção automática do provedor de banco e, adicionalmente, dumps lógicos (`pg_dump`) para portabilidade e restauração pontual.
- **Nunca aplicar migration destrutiva sem backup verificado e recente.**
- **Restauração só é confiável se for testada** — validar periodicamente em ambiente isolado (seção 6).

## 2. Escopo e frequência

| Tipo | Objetivo | Frequência sugerida | Retenção sugerida |
| --- | --- | --- | --- |
| Backup automático gerenciado (PITR) | Recuperação a ponto no tempo | Contínuo (conforme provedor) | 7–30 dias |
| Dump lógico completo (`pg_dump -Fc`) | Recuperação/portabilidade | Diário | 30 dias |
| Dump pré-migration | Ponto de retorno antes de schema/data destrutiva | Antes de cada migration de risco | Até estabilizar a release |

Objetivos de referência (ajustáveis ao contrato):

- **RPO** (perda máxima aceitável): até 24h para dumps lógicos; minutos quando PITR do provedor está ativo.
- **RTO** (tempo de recuperação alvo): horas, dependendo do tamanho do banco e do teste de restore.

> Backups automáticos/PITR dependem do provedor do banco (ex.: Vercel Postgres/Neon, Supabase, RDS). Confirme no painel do provedor que a retenção está ativa e compatível com o RPO desejado.

## 3. Pré-requisitos

- Cliente PostgreSQL (`pg_dump`, `pg_restore`, `psql`) na versão **igual ou superior** à do servidor.
- `DATABASE_URL` do ambiente alvo (produção para backup; alvo isolado para restore).
- Local de armazenamento seguro para os dumps (nunca no repositório Git).

## 4. Backup

**Definir a conexão (PowerShell)**

```powershell
$env:DATABASE_URL = "postgresql://user:password@host:5432/ticketbr"
```

**Dump lógico completo (formato custom, comprimido)**

```bash
pg_dump "$DATABASE_URL" -Fc -f "backup-ticketbr-$(date +%Y%m%d-%H%M).dump"
```

**Dump apenas do schema (DDL)**

```bash
pg_dump "$DATABASE_URL" --schema-only -f "schema-ticketbr-$(date +%Y%m%d).sql"
```

**Dump de dados em texto (para inspeção) ou apenas tabelas críticas**

```bash
pg_dump "$DATABASE_URL" -Fp -f "data-ticketbr-$(date +%Y%m%d).sql"
pg_dump "$DATABASE_URL" -Fc -t tickets -t users -f "core-ticketbr-$(date +%Y%m%d).dump"
```

Boas práticas:

- Armazenar os dumps em storage dedicado (S3/objeto) com **criptografia em repouso** e controle de acesso.
- Não versionar dumps no Git.
- Registrar data/hora e versão do schema (última migration aplicada) junto ao arquivo.

## 5. Restore

> Restaurar **sobrescreve** dados. Confirme o ambiente alvo antes de executar.

**Restauração completa em um banco limpo**

```bash
createdb -h <host> -U <user> ticketbr_restore
pg_restore --no-owner --no-privileges -d "postgresql://user:password@host:5432/ticketbr_restore" "backup-ticketbr-AAAAMMDD-HHMM.dump"
```

**Restauração sobre um banco existente (recriando objetos)**

```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" "backup-ticketbr-AAAAMMDD-HHMM.dump"
```

**Restauração a partir de dump em texto**

```bash
psql "$DATABASE_URL" -f "data-ticketbr-AAAAMMDD.sql"
```

Após restaurar:

1. Ajustar `DATABASE_URL` da aplicação para o banco restaurado.
2. Rodar `npm run db:migrate` para garantir que o schema está no estado esperado.
3. Validar com `GET /api/health` (`dependencies.database.status: "up"`, `env.missing: []`) e smoke dos fluxos críticos.

## 6. Teste de restore (obrigatório periodicamente)

1. Provisionar um banco **isolado** (não produção).
2. Restaurar o dump mais recente nele (seção 5).
3. Rodar `npm run db:migrate` e validar a aplicação apontando para o banco restaurado.
4. Conferir integridade básica: contagem de `tickets`, `users`, último `kpi_snapshots.snapshot_date`.
5. Registrar data, tempo gasto (RTO real) e resultado; corrigir desvios.

Sugestão de cadência: mensal, ou a cada mudança relevante de schema.

## 7. Backup antes de migration de risco

Para migrations destrutivas (drop de coluna/tabela, alteração de tipo com perda de dados, backfill irreversível):

1. Gerar dump imediatamente antes de aplicar a migration:

   ```bash
   pg_dump "$DATABASE_URL" -Fc -f "pre-migration-<nome>.dump"
   ```

2. Aplicar a migration (`npm run db:migrate`).
3. Validar a aplicação; manter o dump até a release estabilizar.

## 8. Retenção e descarte

- Definir política de expiração dos dumps (ex.: 30 dias) e removê-los de forma controlada.
- Manter ao menos um dump por mês por período mais longo quando exigido por compliance.
- Dumps pré-migration podem ser descartados após a release ficar estável em produção.

## 9. Registro

Manter um histórico simples com: data/hora, tipo (automático/lógico/pré-migration), ambiente, tamanho, última migration aplicada e responsável. Registrar também os testes de restore (data e resultado).

## 10. Referências

- [Guia de deploy](./guia-deploy.md) — pipeline, migrations e rollback.
- [Runbook de incidentes](./runbook-incidentes.md) — resposta a indisponibilidade de banco (P1001/P1002/ECONNREFUSED).
- [`.env.example`](../../.env.example) — variáveis de conexão.
