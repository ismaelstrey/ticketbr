# TIC-22 - QA Governance Gate Definition (TicketBR)

## 1. Resumo tecnico executivo
- Objetivo: estabelecer governanca de QA com gates obrigatorios para prevenir regressao funcional, quebra de contrato e release sem evidencia.
- Contexto: TicketBR opera em Next.js fullstack + Prisma com modulos criticos (Tickets/Kanban, Chat/WhatsApp, Portal do Cliente, Projetos/Tarefas, Storage) e integracoes externas sensiveis.
- Impacto: aumenta previsibilidade de entrega, reduz incidentes em producao e fortalece decisao de go/no-go baseada em evidencia tecnica.

## 2. Arquitetura proposta
- Componentes afetados:
  - `.github/workflows/ci.yml`: enforce dos gates automatizados.
  - `src/**/*.test.ts(x)`: suites unitarias, integracao e API.
  - `src/app/api/**`: superficie de contrato HTTP para validacao de QA.
  - `src/server/services/**`: regras de negocio com testes de regressao critica.
  - `docs/architecture/*.md`: baseline de governanca por dominio.
- Limites de responsabilidade:
  - QA: define matriz de risco, evidencia de testes e recomendacao de release.
  - Backend/Frontend/DB: implementam testes e correcoes para atender gates.
  - Security: valida controles de seguranca em fluxos sensiveis.
  - DevOps: garante execucao e rastreabilidade dos gates no CI/CD.
  - CTO: decisao final `Aprovada | Aprovada com ressalvas | Bloqueada`.
- Fluxo:
  - PR aberta -> classificacao de risco (`low|medium|high`) -> CI executa gates -> QA consolida evidencias -> Security valida quando aplicavel -> CTO decide release.

## 3. Decisoes tecnicas (ADRs resumidas)

### ADR-QA-001: Gate orientado por risco (nao apenas volume de testes)
- Decisao: PRs devem ser avaliadas por risco de negocio/tecnico e obrigar suites criticas por dominio afetado.
- Alternativas consideradas: gate unico com execucao indiferenciada para todo PR.
- Justificativa: aumenta foco em caminhos de maior impacto sem travar throughput de alteracoes de baixo risco.
- Avaliacao (1-5): negocio 5 | risco tecnico 2 | risco seguranca 2 | manutencao 2 | escala/performance 3 | tempo 3 | reversibilidade 4
- Classificacao: **Aprovada**.

### ADR-QA-002: Evidencia minima obrigatoria para go/no-go
- Decisao: nenhum release segue sem evidencias de `lint/typecheck`, testes criticos, build e validacao de contrato API.
- Alternativas consideradas: aprovacao manual sem trilha de evidencia.
- Justificativa: reduz subjetividade e elimina aprovacao baseada em percepcao.
- Avaliacao (1-5): negocio 5 | risco tecnico 2 | risco seguranca 3 | manutencao 2 | escala/performance 3 | tempo 2 | reversibilidade 5
- Classificacao: **Aprovada**.

### ADR-QA-003: Falha em seguranca/compliance em fluxo sensivel bloqueia release
- Decisao: qualquer falha em auth/RBAC/audit/rate-limit em endpoints sensiveis bloqueia merge ate mitigacao.
- Alternativas consideradas: aceite de risco para corrigir pos-release.
- Justificativa: risco de incidente/compliance superior ao ganho de prazo.
- Avaliacao (1-5): negocio 5 | risco tecnico 4 | risco seguranca 5 | manutencao 3 | escala/performance 2 | tempo 2 | reversibilidade 2
- Classificacao: **Bloqueada** para bypass; plano alternativo: liberar apenas escopo nao sensivel por feature flag + prazo formal de remediacao.

### ADR-QA-004: Contratos de handoff entre agentes sao gate formal
- Decisao: cada agente entrega artefato verificavel (entrada/saida) antes de passar para o proximo.
- Alternativas consideradas: handoff informal por comentario de PR.
- Justificativa: reduz perda de contexto e regressao entre fronteiras frontend/backend/db/qa/security/devops.
- Avaliacao (1-5): negocio 4 | risco tecnico 2 | risco seguranca 2 | manutencao 2 | escala/performance 2 | tempo 2 | reversibilidade 5
- Classificacao: **Aprovada com ressalvas** (ressalva: permitir excecao temporaria em hotfix P1 com aprovacao CTO + Security).

## 4. Plano de implementacao
1. Publicar baseline TIC-22 (este documento) e alinhar owners por agente tecnico.
2. Definir matriz de risco padrao por modulo (Tickets, Chat, Portal, Projetos, Storage, Auth).
3. Catalogar suites criticas obrigatorias por modulo e manter mapa vivo de cobertura.
4. Integrar checklist QA no template de PR com evidencias minimas obrigatorias.
5. Executar piloto em fluxo de alto risco (Chat inbound/outbound e Tickets/Kanban).
6. Ajustar thresholds e regras apos 2 sprints com base em incidentes e falsos positivos.
7. Institucionalizar reporte semanal para Exec Team (`PASS|FAIL|PARTIAL|BLOCKED` por gate).

Dependencias:
- Baseline de contratos API por dominio.
- Ambiente de teste confiavel para APIs e fluxos criticos.
- Disponibilidade de QA/Security para revisao de PR high risk.

## 5. Qualidade e testes
- Estrategia minima:
  - Unit: regras puras em `src/lib/**` e `src/server/services/**`.
  - Integration: services com adapters controlados/mocks e cenarios de falha.
  - API: status code, contrato de resposta/erro, autorizacao e idempotencia.
  - E2E focal: fluxos criticos de negocio (Tickets/Kanban, Chat, Portal, Projetos).
- Criterios minimos (hard gate):
  - `npm run lint` sem erro.
  - `npm test` sem falhas em suites criticas.
  - `npm run build` sem erro.
  - PR que altera fluxo critico deve incluir teste novo/ajustado no mesmo PR.
  - Evidencias anexadas no PR (logs de CI + resumo QA de risco residual).

## 6. Seguranca
- Riscos principais:
  - regressao de auth/RBAC em endpoints sensiveis;
  - validacao insuficiente de webhook/integracao externa;
  - vazamento de dados sensiveis em erro/log;
  - ausencia de trilha de auditoria em acoes administrativas.
- Controles obrigatorios:
  - testes negativos para acesso sem permissao;
  - validacao de auth/RBAC/rate-limit/audit em rotas sensiveis;
  - sanitizacao/redacao de dados sensiveis em logs;
  - parecer Security obrigatorio para PR high risk com impacto em dados/autorizacao.

## 7. Observabilidade
- Logs estruturados por execucao de gate:
  - `gateName`, `status`, `module`, `commitSha`, `durationMs`, `traceId`.
- Metricas de QA:
  - taxa de falha por gate;
  - tempo medio para correcao de gate quebrado;
  - taxa de escape para producao (defeito pos-release);
  - estabilidade de testes (flaky rate).
- Tracing:
  - correlacao entre falha de teste, endpoint e service impactado.
- Health checks:
  - validacao de `/api/health` no pipeline e pos-deploy.

## 8. Riscos tecnicos e mitigacao
- Risco: suite lenta e instavel reduzir throughput.
  - Mitigacao: separar suites criticas bloqueantes de suites extensivas nao bloqueantes.
- Risco: falso verde (teste passa sem cobrir caminho critico).
  - Mitigacao: mapa de cobertura por fluxo critico e revisao quinzenal de lacunas.
- Risco: gate manual sem padrao entre times.
  - Mitigacao: checklist unico de PR + template de evidencia QA.
- Risco: acoplamento de teste com implementacao interna.
  - Mitigacao: priorizar teste comportamental/contrato e reduzir asserts fragilizados.

## 9. Plano de rollback
1. Bloquear merge/release quando gate critico falhar.
2. Reverter para ultimo commit/release estavel com todos os gates verdes.
3. Se houver migracao associada, seguir plano de rollback/compatibilidade do TIC-21.
4. Desativar feature por flag quando rollback total nao for seguro.
5. Validar health checks e executar smoke dos fluxos criticos apos rollback.

## 10. Criterios de pronto (DoD tecnico)
- Tipagem/build sem erro.
- Testes criticos passando.
- Contratos de API consistentes e versionaveis.
- Validacoes de seguranca aplicadas (auth/RBAC/rate-limit/audit quando aplicavel).
- Migracao de banco segura e reversivel (quando houver impacto de schema).
- Observabilidade minima implementada para os gates e fluxo de release.
- Documentacao tecnica essencial atualizada (governanca + evidencias + riscos residuais).

## 11. Handoff por agente
- Backend
  - Entrada: escopo funcional + matriz de risco + contrato API.
  - Saida: services/rotas com testes unit/integration/api e evidencias de gate.
- Frontend
  - Entrada: contrato API + cenarios de erro/permissao.
  - Saida: validacao de fluxo critico com testes e telemetria de erro.
- DB
  - Entrada: diff de schema/migration + impacto funcional.
  - Saida: migracao segura, compatibilidade e evidencias de integridade.
- QA
  - Entrada: diff completo + criterios de aceite + classificacao de risco.
  - Saida: relatorio de execucao de testes, risco residual e recomendacao de release.
- Security
  - Entrada: endpoints sensiveis tocados + dados processados + integracoes externas.
  - Saida: parecer de controles, vulnerabilidades e condicoes para go/no-go.
- DevOps
  - Entrada: requisitos de pipeline, observabilidade e rollback.
  - Saida: CI/CD com gates obrigatorios, artefatos de execucao e runbook atualizado.

## Gate checklist obrigatorio (QA PR)
- Classificacao de risco da PR (`low|medium|high`) preenchida.
- Gates de tipagem/teste/build verdes com artefatos anexados.
- Evidencia de contrato API para endpoints alterados.
- Evidencia de validacao de seguranca em fluxos sensiveis.
- Parecer QA com risco residual e recomendacao (`go|go com ressalvas|no-go`).
- Decisao CTO registrada com base no framework de 7 dimensoes.

## Entregavel semanal esperado (ritual CTO)
- Status da arquitetura e hotspots tecnicos da semana.
- Qualidade por gate (`PASS|FAIL|PARTIAL|BLOCKED`) e tendencia.
- Riscos criticos com owners e prazo de mitigacao.
- Divida tecnica priorizada (top 5) com impacto estimado.
- Plano tecnico da proxima semana com sequenciamento por agentes.
