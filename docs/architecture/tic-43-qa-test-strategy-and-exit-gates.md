# TIC-43 - Trilha QA TicketBR: Estrategia de Testes e Gates de Saida

## 1. Resumo tecnico executivo
- Objetivo: operacionalizar a trilha de QA do TicketBR com gates de saida verificaveis por risco de mudanca e modulo impactado.
- Contexto: o projeto ja possui baseline de governanca (TIC-22), porem faltava uma trilha executavel para classificar PRs, determinar suites obrigatorias e padronizar decisao de go/no-go.
- Impacto: reduz regressao em producao, aumenta previsibilidade de release e cria trilha unica de evidencias para CTO/Exec Team.

## 2. Arquitetura proposta
- Componentes afetados:
  - `.github/workflows/ci.yml`: pipeline bloqueante para `prisma:validate`, `prisma:generate`, `lint`, `test`, `build`.
  - `.github/pull_request_template.md`: contrato de entrada obrigatorio por PR (risco, evidencias, seguranca, rollback).
  - `src/**/*.test.ts(x)`: suites por camada (unit, integration, api, e2e focal).
  - `docs/architecture/*.md`: governanca por dominio e consolidacao de risco residual.
- Limites de responsabilidade:
  - API route fina (validacao/IO) e regra de negocio em `src/server/services/**`.
  - Integracoes externas via adapters (`n8n`, `evolution`, `uazapi`, storage).
  - Dados e schema versionados somente por migration com compatibilidade explicita.
- Fluxo:
  - PR aberta -> classificacao de risco (`low|medium|high`) -> execucao dos gates CI -> validacao QA/Security (quando aplicavel) -> decisao CTO (`Aprovada | Aprovada com ressalvas | Bloqueada`).

## 3. Decisoes tecnicas (ADRs resumidas)

### ADR-TIC43-001: Gate de saida orientado por risco e modulo
- Decisao: toda PR declara risco e modulo tocado para determinar escopo minimo de testes obrigatorios.
- Alternativas consideradas: gate uniforme para qualquer PR.
- Justificativa: melhora custo-beneficio de QA sem enfraquecer cobertura de fluxos criticos.
- Framework 7 dimensoes:
  - Impacto negocio: alto
  - Risco tecnico: medio
  - Risco seguranca/compliance: medio
  - Custo manutencao: baixo
  - Escalabilidade/performance: medio
  - Tempo implementacao: baixo
  - Reversibilidade: alta
- Classificacao: **Aprovada**.

### ADR-TIC43-002: Evidencia obrigatoria no PR template
- Decisao: sem checklist preenchido e evidencias de gate, PR nao e elegivel para merge/release.
- Alternativas consideradas: evidencias apenas em comentarios ad-hoc.
- Justificativa: remove ambiguidade, reduz perda de contexto e padroniza handoff entre agentes.
- Framework 7 dimensoes:
  - Impacto negocio: alto
  - Risco tecnico: baixo
  - Risco seguranca/compliance: medio
  - Custo manutencao: baixo
  - Escalabilidade/performance: neutro
  - Tempo implementacao: baixo
  - Reversibilidade: alta
- Classificacao: **Aprovada**.

### ADR-TIC43-003: Fail-fast para seguranca em rotas sensiveis
- Decisao: alteracao em auth/RBAC/auditoria/webhook/dados sensiveis sem teste de seguranca correspondente bloqueia saida.
- Alternativas consideradas: aceitar risco e corrigir em hardening posterior.
- Justificativa: reduz probabilidade de incidente de acesso indevido ou nao conformidade.
- Framework 7 dimensoes:
  - Impacto negocio: alto
  - Risco tecnico: medio
  - Risco seguranca/compliance: alto
  - Custo manutencao: medio
  - Escalabilidade/performance: neutro
  - Tempo implementacao: medio
  - Reversibilidade: media
- Classificacao: **Bloqueada** para bypass. Plano alternativo: liberar apenas escopo nao sensivel por feature flag e corrigir controle faltante antes do proximo release.

## 4. Plano de implementacao
1. Publicar este baseline TIC-43 e alinhar ownership por agente (Backend/Frontend/DB/QA/Security/DevOps).
2. Ativar PR template obrigatorio com classificacao de risco e gates.
3. Mapear suites criticas por modulo e risco (matriz abaixo) e revisar semanalmente.
4. Aplicar trilha em piloto nos modulos Chat/WhatsApp e Tickets/Kanban.
5. Medir escapes, flaky rate e tempo de recuperacao de gate quebrado por 2 sprints.
6. Ajustar limiares e consolidar ritual semanal para Exec Team.

Dependencias:
- Suites de teste executaveis no CI.
- Owners de QA/Security disponiveis para PR medium/high.
- Padrao de migration segura para alteracoes de schema.

### Matriz minima de suites por risco
- `low`: unit + build + smoke de API alterada.
- `medium`: unit + integration + API contract + build.
- `high`: unit + integration + API contract + e2e focal + seguranca negativa (auth/RBAC/audit/rate-limit) + plano de rollback validado.

### Cobertura minima por modulo critico
- Tickets/Kanban: mudanca de status, SLA, filtros, historico e transicao de coluna.
- Chat/WhatsApp: inbound normalizer, outbound provider, deduplicacao, fallback e persistencia de conversa.
- Portal do Cliente: autenticacao, autorizacao por tenant, listagem e comentario de ticket.
- Projetos/Tarefas: CRUD, vinculacao ticket-tarefa, movimentacao de status e anexos.
- Storage: upload-url, download-url, permissao por contexto e expiracao de links.

## 5. Qualidade e testes
- Estrategia:
  - Unit: `src/lib/**`, `src/server/services/**`.
  - Integration: services com adapters mockados e cenarios de falha.
  - API: contrato HTTP (status, payload, erro), auth e idempotencia.
  - E2E focal: fluxos de negocio de maior impacto.
- Criterios minimos (hard gate):
  - `npm run prisma:validate` sem erro.
  - `npm run prisma:generate` sem erro.
  - `npm run lint` sem erro.
  - `npm test` sem falhas nas suites obrigatorias por risco.
  - `npm run build` sem erro.
  - PR high-risk com pelo menos 1 teste novo/atualizado no fluxo alterado.

## 6. Seguranca
- Riscos:
  - regressao de auth/RBAC em endpoints sensiveis;
  - webhook/integracao externa sem validacao robusta;
  - log com dados sensiveis;
  - ausencia de auditoria em acao administrativa.
- Controles:
  - testes negativos de permissao;
  - validacao de auth/RBAC/rate-limit/audit quando aplicavel;
  - redacao de dados sensiveis em log/erro;
  - parecer Security obrigatorio para PR high-risk ou alteracao de auth/dados.

## 7. Observabilidade
- Logs estruturados de gate (minimo): `gate`, `status`, `module`, `risk`, `commitSha`, `durationMs`.
- Metricas de qualidade:
  - `gate_pass_rate` por etapa;
  - `flaky_test_rate`;
  - `defect_escape_rate` pos-release;
  - `mttr_gate_failure`.
- Tracing:
  - correlacionar falha de API/teste com service impactado.
- Health checks:
  - validacao de `GET /api/health` no pipeline e pos-deploy.

## 8. Riscos tecnicos e mitigacao
- Risco: suites lentas degradarem throughput.
  - Mitigacao: separar gates bloqueantes de suites extensivas nao bloqueantes.
- Risco: cobertura insuficiente em caminho critico.
  - Mitigacao: mapa de fluxo critico por modulo com revisao quinzenal.
- Risco: classificacao de risco inconsistente entre squads.
  - Mitigacao: criterio unico no PR template + revisao QA.
- Risco: acoplamento excessivo de testes em detalhes internos.
  - Mitigacao: foco em comportamento e contrato publico.

## 9. Plano de rollback
1. Bloquear merge/release ao falhar gate critico.
2. Reverter para ultima versao com gates verdes.
3. Em mudanca de schema, aplicar rollback de migration ou estrategia de compatibilidade forward/backward.
4. Desativar feature por flag quando rollback total nao for seguro.
5. Validar `health`, smoke funcional e monitoramento apos rollback.

## 10. Criterios de pronto (DoD tecnico)
- Tipagem/build sem erro.
- Testes criticos passando conforme risco.
- Contratos API consistentes e versionaveis.
- Validacoes de seguranca aplicadas (auth/RBAC/rate-limit/audit quando aplicavel).
- Migration segura e reversivel (quando houver schema).
- Observabilidade minima implementada para gate e fluxo afetado.
- Documentacao tecnica essencial atualizada (governanca, evidencias, risco residual).

## 11. Handoff por agente
- Backend
  - Entrada: escopo + risco + contrato API.
  - Saida: services/rotas com testes e evidencias de gate.
- Frontend
  - Entrada: contrato API + cenarios de erro/permissao.
  - Saida: fluxo UI validado, tratamento de estados de erro e testes.
- DB
  - Entrada: diff schema/migration e impacto funcional.
  - Saida: migration segura, compatibilidade, plano de rollback.
- QA
  - Entrada: diff + criterio de aceite + classificacao de risco.
  - Saida: relatorio de execucao, risco residual e recomendacao `go|go_com_ressalvas|no_go`.
- Security
  - Entrada: endpoints sensiveis, dados envolvidos, integracoes externas.
  - Saida: parecer de controles, vulnerabilidades e condicoes para release.
- DevOps
  - Entrada: requisitos de pipeline/observabilidade/rollback.
  - Saida: gates CI/CD executados, artefatos e runbook atualizado.

## 12. Evidencia inicial de gates (2026-04-16)
- Escopo: execucao local de baseline para validar trilha de saida antes do piloto por modulo.
- Resultado:
  - `npm run prisma:validate`: PASS
  - `npm run prisma:generate`: PASS
  - `npm run lint`: PASS
  - `npm test`: PASS (`54` arquivos, `126` testes)
  - `npm run build`: PASS
- Observacao operacional:
  - Na primeira tentativa, `next build` falhou por lock em `.next/lock` devido concorrencia de processo. Reexecucao realizada com sucesso apos limpeza do lock da sessao.

## Entregavel semanal (Exec Team)
- Status de arquitetura e hotspots da semana.
- Qualidade semanal por gate (`PASS|FAIL|PARTIAL|BLOCKED`).
- Riscos criticos com owner e prazo de mitigacao.
- Divida tecnica priorizada (top 5) com impacto.
- Plano tecnico da proxima semana com sequenciamento por agentes.
