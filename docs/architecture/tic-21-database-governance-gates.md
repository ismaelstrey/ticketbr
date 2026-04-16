# TIC-21 - Database Governance Gate Definition (TicketBR)

## 1. Resumo tecnico executivo
- Objetivo: instituir governanca obrigatoria para mudancas de banco de dados no TicketBR, com gates que previnam regressao estrutural, indisponibilidade e risco de compliance.
- Contexto: stack Next.js fullstack com Prisma, PostgreSQL e modulos criticos (Tickets/Kanban, Chat/WhatsApp, Portal Cliente, Projetos/Tarefas, Storage) que dependem de evolucao segura de schema.
- Impacto: reduz falha de deploy por migration, melhora previsibilidade de release, protege integridade de dados e viabiliza escala com menor risco operacional.

## 2. Arquitetura proposta
- Componentes afetados:
  - `prisma/schema.prisma`: contrato de dados canonical.
  - `prisma/migrations/**/migration.sql`: trilha versionada de evolucao.
  - `src/server/services/**`: camada de dominio consumidora de dados.
  - `src/app/api/**`: transporte HTTP sem regra de persistencia acoplada.
  - `.github/workflows/ci.yml`: enforce de gates de DB em PR.
- Limites de responsabilidade:
  - DB/Schema: modelagem, constraints, indices, compatibilidade e estrategia de migracao.
  - Services: regra de negocio e orquestracao transacional.
  - API routes: validacao de entrada/saida e delegacao para services.
  - DevOps: execucao segura de migration/deploy com evidencia.
- Fluxo:
  - Mudanca de schema -> proposta ADR curta + risco classificado -> implementacao migration -> validacao automatizada/manual -> aprovacao CTO (`Aprovada | Aprovada com ressalvas | Bloqueada`).

## 3. Decisoes tecnicas (ADRs resumidas)

### ADR-DB-001: Expand/Contract obrigatorio para mudanca breaking
- Decisao: alteracoes potencialmente breaking (drop/rename/not null sem default/tipo incompativel) devem seguir estrategia expand/contract em pelo menos 2 etapas.
- Alternativas consideradas: alteracao direta em uma unica migration.
- Justificativa: reduz indisponibilidade, permite rollout gradual e rollback controlado.
- Avaliacao (1-5): negocio 5 | risco tecnico 2 | risco seguranca 2 | manutencao 2 | escala/performance 4 | tempo 3 | reversibilidade 5
- Classificacao: **Aprovada**.

### ADR-DB-002: Migration versionada e rastreavel como unica via para producao
- Decisao: proibido alterar schema de producao via `db push`; producao usa somente `migrate deploy` com arquivos versionados em `prisma/migrations`.
- Alternativas consideradas: uso oportunistico de `db push` para acelerar hotfix.
- Justificativa: preserva historico auditavel, reproducibilidade e consistencia entre ambientes.
- Avaliacao (1-5): negocio 4 | risco tecnico 2 | risco seguranca 3 | manutencao 1 | escala/performance 3 | tempo 2 | reversibilidade 4
- Classificacao: **Aprovada**.

### ADR-DB-003: Gate de risco para SQL destrutivo
- Decisao: migrations com `DROP`, `TRUNCATE`, alteracao de constraint sem compatibilidade, ou backfill massivo devem ser classificadas como high risk e exigem plano de impacto + rollback testado.
- Alternativas consideradas: tratar toda migration igualmente.
- Justificativa: concentra rigor onde o risco real e maior sem travar mudancas de baixo impacto.
- Avaliacao (1-5): negocio 5 | risco tecnico 3 | risco seguranca 3 | manutencao 2 | escala/performance 4 | tempo 3 | reversibilidade 4
- Classificacao: **Aprovada com ressalvas** (ressalva: hotfix urgente pode seguir fast-track com aprovacao explicita Security + CTO).

### ADR-DB-004: Bloqueio de release sem evidencias de integridade e auditoria
- Decisao: release com mudanca de schema e bloqueada sem evidencias minimas de integridade referencial, impacto em RBAC/audit e validacao de consultas criticas.
- Alternativas consideradas: liberar e validar pos-producao.
- Justificativa: risco alto de incidente irreversivel e inconsistencias de dados.
- Avaliacao (1-5): negocio 5 | risco tecnico 4 | risco seguranca 5 | manutencao 3 | escala/performance 3 | tempo 2 | reversibilidade 2
- Classificacao: **Bloqueada** para bypass; plano alternativo: liberar somente camada aplicacional com feature flag sem ativar caminho que depende da nova estrutura.

## 4. Plano de implementacao
1. Publicar baseline TIC-21 (este documento) e alinhar owners Backend/DB/QA/Security/DevOps.
2. Definir checklist de PR para mudancas em `prisma/schema.prisma` e `prisma/migrations/**`.
3. Instituir classificacao de risco de migration (`low|medium|high`) no template de PR.
4. Exigir para toda migration:
   - objetivo funcional;
   - impacto estimado (tabela/linha/index);
   - estrategia de deploy;
   - estrategia de rollback/compatibilidade.
5. Fortalecer CI para garantir, no minimo:
   - typecheck/build/testes criticos;
   - validacao Prisma (`prisma generate` e schema consistente com migrations).
6. Executar piloto em um modulo de alto impacto (Projetos ou Tickets) e expandir para todo dominio.

Dependencias:
- Ambiente de homologacao com base representativa de dados.
- Responsavel DB para revisao de query plan e lock risk.
- Alinhamento com Security para trilha de auditoria e dados sensiveis.

## 5. Qualidade e testes
- Estrategia minima:
  - Unit: regras de dominio que dependem de novos campos/constraints.
  - Integration: services com leitura/escrita nos novos caminhos de persistencia.
  - API: compatibilidade de contrato antes/durante/depois da migracao (quando expand/contract).
  - E2E focal: fluxo critico afetado (ex.: criacao/atualizacao ticket, chat inbound persistencia, tarefas/projetos).
- Validacoes especificas de DB:
  - migration aplica com sucesso em banco limpo e baselineado.
  - integridade referencial e constraints esperadas ativas.
  - indices criticos presentes e consultas chave sem regressao severa.
- Criterios minimos (hard gate):
  - `npm run lint` sem erro.
  - `npm test` sem falha em suites criticas.
  - `npm run build` sem erro.
  - alteracoes de schema com testes novos/ajustados no mesmo PR.

## 6. Seguranca
- Riscos principais:
  - exposicao de dados sensiveis por modelagem inadequada;
  - perda de trilha de auditoria em alteracoes estruturais;
  - escalacao de privilegio por falha de constraint/permissao;
  - inconsistencia de dados por migracao parcial.
- Controles obrigatorios:
  - revisao de dados sensiveis (PII) e politica de retencao/minimizacao.
  - validacao de impacto em auth/RBAC e `AuditLog`.
  - bloqueio de SQL destrutivo sem plano formal de mitigacao.
  - segredo de conexao e operacao de migration apenas por pipeline controlado.

## 7. Observabilidade
- Logs de migration/deploy:
  - `migrationId`, `durationMs`, `status`, `environment`, `executor`.
- Metricas:
  - tempo medio de migration;
  - falhas de migration por ambiente;
  - lock wait/timeout em mudancas high risk;
  - regressao de latencia p95 em queries criticas.
- Tracing:
  - correlacao deploy -> migration -> erro de service/API (quando houver).
- Health checks:
  - validacao pos-deploy em `/api/health` com conectividade DB e query sentinela leve.

## 8. Riscos tecnicos e mitigacao
- Risco: migration bloquear tabela quente.
  - Mitigacao: janela controlada, estrategia expand/contract, validacao previa de plano e lock.
- Risco: drift entre schema e runtime.
  - Mitigacao: gate de `prisma generate` + revisao de contratos service/API no mesmo PR.
- Risco: rollback incompleto em mudanca destrutiva.
  - Mitigacao: proibicao de drop direto sem shadow rollout e plano de restauracao.
- Risco: queda de performance por ausencia/erro de indice.
  - Mitigacao: revisao de indices obrigatoria para novos padroes de consulta.

## 9. Plano de rollback
1. Identificar release estavel anterior e estado de migration aplicado.
2. Reverter aplicacao para versao compativel com schema vigente (prioridade).
3. Executar rollback de schema somente quando reversibilidade estiver validada previamente.
4. Sem rollback seguro de schema: manter compatibilidade forward e desativar feature impactada por flag.
5. Validar integridade (contagem/consistencia), health checks e trilha de auditoria.

## 10. Criterios de pronto (DoD tecnico)
- Tipagem/build sem erro.
- Testes criticos passando.
- Contratos de API consistentes e versionaveis frente ao novo schema.
- Validacoes de seguranca aplicadas (auth/RBAC/rate-limit/audit quando aplicavel).
- Migracao de banco segura e reversivel (ou plano de compatibilidade formal).
- Observabilidade minima implementada para deploy/migration.
- Documentacao tecnica essencial atualizada (ADR curta + notas de migration).

## 11. Handoff por agente
- Backend
  - Entrada: diff de schema/migration + impacto funcional.
  - Saida: services ajustados, testes de integracao/API, compatibilidade de contrato.
- Frontend
  - Entrada: alteracao de payload/campos e janela de compatibilidade.
  - Saida: adaptacao progressiva de consumo sem quebra de UX.
- DB
  - Entrada: proposta de modelagem, volume, perfil de consulta.
  - Saida: migration SQL revisada, plano de impacto e rollback validados.
- QA
  - Entrada: matriz de risco da migration + fluxos afetados.
  - Saida: evidencias de teste funcional e regressao de dados.
- Security
  - Entrada: mudancas de dados sensiveis, auth e audit.
  - Saida: parecer de risco residual e controles exigidos.
- DevOps
  - Entrada: requisitos de pipeline e observabilidade de migration.
  - Saida: gates CI/CD, logs de deploy, runbook de incidente/rollback.

## Gate checklist obrigatorio (database PR)
- `schema.prisma` e `migrations` versionados e coerentes com objetivo funcional.
- Classificacao de risco da migration (`low|medium|high`) preenchida no PR.
- Plano de deploy + rollback documentados.
- Evidencia de teste dos fluxos criticos afetados.
- Validacao de seguranca (RBAC/audit/dados sensiveis) quando aplicavel.
- Evidencias anexadas no PR (saida de CI, logs de migration, parecer QA/Security).

## Framework de decisao tecnica (uso obrigatorio em toda decisao de DB)
Para cada mudanca estrutural, registrar nota 1-5 em:
1. Impacto no negocio/produto
2. Risco tecnico
3. Risco de seguranca/compliance
4. Custo de manutencao
5. Escalabilidade/performance
6. Tempo de implementacao
7. Reversibilidade

Regra de decisao:
- **Aprovada**: alto impacto com risco controlado e rollback claro.
- **Aprovada com ressalvas**: valor claro, mas depende de mitigacao com owner e prazo.
- **Bloqueada**: risco nao aceitavel sem contramedidas; deve sair com plano alternativo.

## Entregavel semanal esperado (ritual CTO)
- Status da arquitetura de dados e hotspots (locks, consultas caras, areas sem cobertura).
- Qualidade da semana por gate (`PASS|FAIL|PARTIAL|BLOCKED`).
- Riscos criticos de DB e plano de mitigacao.
- Divida tecnica de dados priorizada.
- Plano tecnico da proxima semana para evolucao de schema.
