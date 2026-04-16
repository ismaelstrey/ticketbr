# TIC-24 - DevOps Governance Gate Definition (TicketBR)

## 1. Resumo tecnico executivo
- Objetivo: definir governanca DevOps obrigatoria para garantir releases previsiveis, observabilidade minima e rollback seguro no TicketBR.
- Contexto: pipeline atual em `.github/workflows/ci.yml` com validacoes basicas (`prisma validate/generate`, `lint`, `test`, `build`) e necessidade de elevar maturidade para gates operacionais de deploy.
- Impacto: reduz change failure rate, melhora MTTR e cria criterio objetivo de go/no-go para release candidates.

## 2. Arquitetura proposta
- Componentes afetados:
  - `.github/workflows/ci.yml`: gates de validacao tecnica e artefatos de evidencia.
  - `scripts/**`: automacoes operacionais (db deploy/migrate, checks, smoke scripts).
  - `src/app/api/health/route.ts`: health endpoint para readiness/liveness.
  - `docs/architecture/**`: baseline de governanca e evidencias de release.
  - Ambientes `dev`, `staging`, `production` com promocao progressiva.
- Limites de responsabilidade:
  - CI: validacao de codigo e contratos minimos para merge.
  - CD: promocao de artefato imutavel entre ambientes com gates de risco.
  - Runtime observability: logs, metricas e alertas para operacao.
  - Release governance (CTO): decisao final baseada em evidencias objetivas.
- Fluxo:
  - PR -> CI gates tecnicos -> merge -> deploy staging -> smoke + observabilidade -> aprovacao -> deploy production -> validacao pos-deploy.

## 3. Decisoes tecnicas (ADRs resumidas)

### ADR-DEVOPS-001: Pipeline por estagios com gates bloqueantes
- Decisao: padronizar fluxo `verify -> build -> release -> validate` com criterios bloqueantes por estagio.
- Alternativas consideradas: pipeline monolitico sem separacao de responsabilidade.
- Justificativa: aumenta rastreabilidade, facilita diagnostico e reduz bypass operacional.
- Avaliacao (1-5): negocio 5 | risco tecnico 2 | risco seguranca 3 | manutencao 2 | escala/performance 3 | tempo 3 | reversibilidade 4
- Classificacao: **Aprovada**.

### ADR-DEVOPS-002: Promocao de artefato imutavel entre ambientes
- Decisao: build aprovado em CI deve ser o mesmo artefato promovido para staging e producao, sem rebuild por ambiente.
- Alternativas consideradas: rebuild por ambiente com variacao de dependencia.
- Justificativa: reduz drift, aumenta reproducibilidade e confiabilidade de rollback.
- Avaliacao (1-5): negocio 5 | risco tecnico 2 | risco seguranca 3 | manutencao 2 | escala/performance 4 | tempo 3 | reversibilidade 5
- Classificacao: **Aprovada**.

### ADR-DEVOPS-003: Release high-risk exige gate manual com evidencias
- Decisao: mudancas high-risk (schema breaking, auth/RBAC, webhooks, storage critico) exigem aprovacao manual formal apos staging.
- Alternativas consideradas: deploy automatico irrestrito para qualquer merge.
- Justificativa: reduz risco sistemico de incidente em mudancas de alto impacto.
- Avaliacao (1-5): negocio 4 | risco tecnico 3 | risco seguranca 4 | manutencao 3 | escala/performance 2 | tempo 2 | reversibilidade 4
- Classificacao: **Aprovada com ressalvas** (ressalva: hotfix P1 pode usar fast-track com Security + CTO).

### ADR-DEVOPS-004: Bloqueio de release sem observabilidade e rollback verificavel
- Decisao: release e bloqueada sem logs estruturados minimos, metricas de saude e plano de rollback executavel.
- Alternativas consideradas: liberar e observar comportamento apenas em producao.
- Justificativa: reduz tempo de deteccao/recuperacao e evita operacao no escuro.
- Avaliacao (1-5): negocio 5 | risco tecnico 4 | risco seguranca 4 | manutencao 3 | escala/performance 3 | tempo 2 | reversibilidade 2
- Classificacao: **Bloqueada** para bypass; plano alternativo: liberar escopo parcial por feature flag com monitoramento reforcado.

## 4. Plano de implementacao
1. Publicar baseline TIC-24 (este documento) e alinhar owners DevOps, QA, Security e CTO.
2. Definir matriz de risco de deploy (`low|medium|high`) acoplada ao template de PR/release.
3. Estruturar pipeline em estagios com artefatos e evidencias por gate.
4. Formalizar gates de staging: smoke tests, health check, validacao de metricas e erro.
5. Formalizar gates de producao: aprovacao manual para high-risk + runbook de rollback.
6. Padronizar relatorio semanal de qualidade DevOps para Exec Team.

Dependencias:
- Ambiente staging representativo e estavel.
- Monitoracao minima configurada para API critica.
- Runbooks atualizados para incidente e rollback.

## 5. Qualidade e testes
- Estrategia minima:
  - Unit/integration/api/e2e criticos executados no CI antes de liberar artefato.
  - Smoke de deploy em staging para fluxos chave (`auth`, `tickets`, `chat`, `projects`, `health`).
  - Verificacao de compatibilidade de migrations com ambiente alvo.
- Criterios minimos (hard gate):
  - Tipagem/build sem erro.
  - Testes criticos passando.
  - Contrato de API consistente e versionavel.
  - Evidencias de staging anexadas para release candidate.

## 6. Seguranca
- Riscos principais:
  - deploy com segredo/config incorreto;
  - bypass de gate de seguranca em mudanca sensivel;
  - rollout sem validacao de auth/RBAC/audit;
  - exposicao de dados em log operacional.
- Controles obrigatorios:
  - segredo somente por variavel de ambiente gerenciada;
  - approvals obrigatorios para high-risk;
  - check explicito de auth/RBAC/rate-limit/audit quando aplicavel;
  - redacao de dados sensiveis em logs e artefatos.

## 7. Observabilidade
- Logs estruturados minimos:
  - `timestamp`, `traceId`, `env`, `module`, `route`, `status`, `durationMs`, `releaseId`.
- Metricas minimas:
  - disponibilidade (`health pass rate`), erro 5xx por endpoint, latencia p95/p99, falha de integracao externa.
- Tracing:
  - correlacao `releaseId -> request -> service -> adapter` para incidente.
- Health checks:
  - `/api/health` como gate de readiness em staging e validacao pos-deploy em producao.

## 8. Riscos tecnicos e mitigacao
- Risco: pipeline verde sem cobrir risco real de runtime.
  - Mitigacao: smoke tests obrigatorios e monitoracao pos-deploy por janela de observacao.
- Risco: variacao entre ambientes causar regressao apenas em producao.
  - Mitigacao: promocao de artefato imutavel + parity de configuracao por ambiente.
- Risco: rollback lento por ausencia de runbook.
  - Mitigacao: runbook versionado e ensaio de rollback para mudancas high-risk.
- Risco: noise de alerta impedir resposta rapida.
  - Mitigacao: thresholds por severidade e canais de escalacao definidos.

## 9. Plano de rollback
1. Congelar novas promocoes ao detectar degradacao acima do limite.
2. Reverter aplicacao para ultimo release estavel (artefato anterior validado).
3. Aplicar estrategia de rollback de dados conforme TIC-21 (ou compatibilidade forward quando rollback de schema nao for seguro).
4. Desativar feature impactada por flag quando necessario.
5. Validar `health`, erros p95 e fluxos criticos apos rollback.

## 10. Criterios de pronto (DoD tecnico)
- Tipagem/build sem erro.
- Testes criticos passando.
- Contratos de API consistentes e versionaveis.
- Validacoes de seguranca aplicadas (auth/RBAC/rate-limit/audit quando aplicavel).
- Migracao de banco segura e reversivel (quando houver impacto de schema).
- Observabilidade minima implementada (logs, metricas, trace e health).
- Documentacao tecnica essencial atualizada (gates, runbook, risco residual).

## 11. Handoff por agente
- Backend
  - Entrada: contrato de release e riscos por endpoint/servico.
  - Saida: artefato buildavel + testes criticos + notas de compatibilidade.
- Frontend
  - Entrada: contrato API, plano de rollout e fallback UX.
  - Saida: validacao de fluxos cliente em staging e evidencias de smoke.
- DB
  - Entrada: diff de schema/migration e classificacao de risco.
  - Saida: plano de deploy/rollback de migration com evidencia.
- QA
  - Entrada: release candidate, suites criticas e criterios de aceite.
  - Saida: parecer de risco residual e evidencias de testes/smoke.
- Security
  - Entrada: mudancas sensiveis, integracoes externas e matriz de permissao.
  - Saida: parecer de controles obrigatorios e condicoes de go/no-go.
- DevOps
  - Entrada: requisitos de gate, observabilidade e rollback.
  - Saida: pipeline enforce, dashboards/alertas e runbook operacional.

## Gate checklist obrigatorio (DevOps PR/Release)
- CI verde em `prisma:validate`, `prisma:generate`, `lint`, `test`, `build`.
- Classificacao de risco do deploy preenchida e revisada.
- Evidencias de staging anexadas (smoke + health + metricas basicas).
- Plano de rollback validado para alteracoes medium/high-risk.
- Logs e metricas minimas habilitados para modulos alterados.
- Decisao CTO registrada com base no framework de 7 dimensoes.

## Entregavel semanal esperado (ritual CTO)
- Status da arquitetura de plataforma e hotspots de confiabilidade.
- Qualidade da semana por gate (`PASS|FAIL|PARTIAL|BLOCKED`).
- Riscos criticos de operacao com owner e prazo de mitigacao.
- Divida tecnica DevOps priorizada (top 5) com impacto.
- Plano tecnico da proxima semana com sequenciamento por agentes.

## Pipeline gate matrix
| Gate | Estagio | Owner de aprovacao | Evidencia obrigatoria | Fail condition |
| --- | --- | --- | --- | --- |
| Type/Lint | PR verify | Backend/Frontend owner | log de CI com `npm run lint` | qualquer erro de lint/tipagem |
| Testes criticos | PR verify | QA | log de CI com `npm test` + suites criticas | falha de teste critico ou suite indisponivel |
| Build | PR build | DevOps | log de CI com `npm run build` | build quebrado ou warning bloqueante configurado |
| Prisma integrity | PR verify | DB | `prisma:validate` e `prisma:generate` verdes | schema invalido ou generate falho |
| Security controls | Release candidate | Security | checklist auth/RBAC/rate-limit/audit para escopo sensivel | controle obrigatorio ausente |
| Staging smoke | Pre-prod | QA + DevOps | resultado de smoke flows + `/api/health` | fluxo critico indisponivel ou health fail |
| Production approval | Prod gate | CTO | parecer consolidado (`go|go com ressalvas|no-go`) | risco residual sem mitigacao aceita |
| Post-deploy SLO | Prod validate | DevOps | painel com erro/latencia/disponibilidade na janela inicial | quebra de SLO na janela de observacao |

## Deploy and rollback runbook
1. Preparacao
   - Confirmar release notes, risco (`low|medium|high`) e owners de plantao.
   - Congelar mudancas paralelas durante janela de deploy high-risk.
2. Deploy staging
   - Promover artefato imutavel aprovado em CI.
   - Rodar smoke (`auth`, `tickets`, `chat`, `projects`) e validar `/api/health`.
3. Aprovacao pre-prod
   - Coletar parecer QA/Security/DB quando aplicavel.
   - CTO decide `Aprovada | Aprovada com ressalvas | Bloqueada`.
4. Deploy producao
   - Promover o mesmo artefato de staging.
   - Monitorar erros, latencia p95 e disponibilidade por janela minima de 30 minutos.
5. Rollback (se trigger de incidente)
   - Reverter para ultimo release estavel.
   - Aplicar estrategia de dados do TIC-21 para migration associada.
   - Desativar feature por flag se rollback total nao for seguro.
6. Encerramento
   - Registrar incidente/near miss, causa raiz e acao preventiva no backlog.

## SLO and alert standard
- SLO-1 Disponibilidade API critica: >= 99.5% por 30 dias.
- SLO-2 Latencia API critica: p95 <= 800ms e p99 <= 1500ms.
- SLO-3 Erro servidor (5xx): < 1% por endpoint critico.
- SLO-4 Integracoes externas (n8n/Evolution/UAZAPI): taxa de falha < 2% por janela de 1 hora.
- Alertas obrigatorios:
  - `SEV-1`: disponibilidade abaixo de 98% em 5 minutos.
  - `SEV-2`: p95 acima do limite por 15 minutos.
  - `SEV-2`: erro 5xx acima de 2% por 10 minutos.
  - `SEV-2`: falha de webhook/integracao acima de 5% por 10 minutos.
- Politica de resposta:
  - `SEV-1`: acionamento imediato de DevOps + Backend + CTO.
  - `SEV-2`: acionamento DevOps + owner do modulo em ate 15 minutos.

## Example workflow: gate evaluation from change request to approval
1. Change request
   - PR adiciona novo endpoint de upload para Portal Cliente com ajuste em schema.
2. PR verify gates
   - CI executa `prisma:validate`, `prisma:generate`, `lint`, `test`, `build`.
   - Resultado: tudo `PASS`.
3. Risk classification
   - Classificado como `high` por envolver dados sensiveis + storage + migration.
4. Staging validation
   - Deploy staging do artefato aprovado.
   - QA roda smoke funcional; Security valida auth/RBAC/rate-limit/audit; DB valida migration.
5. CTO decision
   - Framework 7 dimensoes aplicado.
   - Decisao: `Aprovada com ressalvas` (monitoramento reforcado nas primeiras 2h).
6. Production progression
   - Deploy producao com janela observada.
   - SLOs permanecem dentro do limite -> release confirmada.
