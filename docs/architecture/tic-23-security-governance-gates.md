# TIC-23 - Security Governance Gate Definition (TicketBR)

## 1. Resumo tecnico executivo
- Objetivo: definir governanca de seguranca obrigatoria para mudancas no TicketBR, com gates bloqueantes para reduzir risco de incidente, vazamento de dados e nao conformidade.
- Contexto: plataforma Next.js fullstack com Prisma, integracoes externas (n8n, Evolution, UAZAPI), modulos criticos (Tickets/Kanban, Chat/WhatsApp, Portal Cliente, Projetos/Tarefas, Storage) e operacao multiagente.
- Impacto: eleva confiabilidade de release, padroniza controle de auth/RBAC/auditoria e reduz custo de resposta a incidentes de seguranca.

## 2. Arquitetura proposta
- Componentes afetados:
  - `src/app/api/**`: superficie HTTP e pontos de entrada sensiveis.
  - `src/server/services/**`: aplicacao de politica de autorizacao e regras de negocio.
  - `src/lib/auth.ts`: autenticacao e utilitarios de identidade.
  - `src/lib/rateLimit.ts`: protecao de abuso e throttling.
  - `src/server/services/audit-log.ts`: trilha de auditoria para acoes sensiveis.
  - `src/lib/encryption.ts`: protecao de segredos e dados sensiveis.
  - `prisma/schema.prisma` + migrations: entidades de identidade, permissoes e auditoria.
  - `.github/workflows/ci.yml`: enforce de gates de seguranca no pipeline.
- Limites de responsabilidade:
  - API routes: validar input, autenticar requisicao e delegar.
  - Services/use-cases: validar autorizacao contextual (RBAC/ownership) e registrar auditoria.
  - Adapters externos: encapsular autenticacao de provider e saneamento de payload.
  - DB: garantir integridade de identidade/permissao e rastreabilidade.
- Fluxo:
  - PR com impacto em auth, dados sensiveis, integracoes ou schema -> gates de seguranca automatizados + revisao Security -> decisao CTO (`Aprovada | Aprovada com ressalvas | Bloqueada`).

## 3. Decisoes tecnicas (ADRs resumidas)

### ADR-SEC-001: Politica Security-by-Default para endpoints sensiveis
- Decisao: endpoints sensiveis devem negar por padrao (`deny-by-default`) e permitir somente com autenticacao valida e autorizacao explicita.
- Alternativas consideradas: checks condicionais apenas em casos conhecidos.
- Justificativa: reduz brechas por omissao e comportamento inconsistente entre modulos.
- Avaliacao (1-5): negocio 5 | risco tecnico 2 | risco seguranca 5 | manutencao 2 | escala/performance 3 | tempo 3 | reversibilidade 4
- Classificacao: **Aprovada**.

### ADR-SEC-002: RBAC centralizado e testavel
- Decisao: regras de permissao devem ser centralizadas em services/policies, proibindo regra de autorizacao duplicada em rotas.
- Alternativas consideradas: autorizacao distribuida por handler.
- Justificativa: reduz acoplamento e divergencia de comportamento.
- Avaliacao (1-5): negocio 5 | risco tecnico 3 | risco seguranca 5 | manutencao 2 | escala/performance 3 | tempo 3 | reversibilidade 4
- Classificacao: **Aprovada**.

### ADR-SEC-003: Trilha de auditoria obrigatoria para acoes sensiveis
- Decisao: acoes de alto impacto (mudanca de permissao, alteracao administrativa, exportacao de dados, mutacoes criticas) exigem registro de auditoria com ator, alvo e contexto.
- Alternativas consideradas: log tecnico generico sem trilha formal.
- Justificativa: requisito de forense, accountability e compliance.
- Avaliacao (1-5): negocio 4 | risco tecnico 3 | risco seguranca 5 | manutencao 3 | escala/performance 2 | tempo 2 | reversibilidade 5
- Classificacao: **Aprovada com ressalvas** (ressalva: rollout por dominio para evitar bloqueio de throughput em curto prazo).

### ADR-SEC-004: Bloqueio de release sem controles minimos em auth/RBAC/rate-limit/audit
- Decisao: release e bloqueada quando endpoint sensivel novo/alterado nao comprova auth, RBAC, rate-limit e auditabilidade quando aplicavel.
- Alternativas consideradas: liberar com backlog de seguranca para sprint seguinte.
- Justificativa: risco de incidente e compliance supera ganho de prazo.
- Avaliacao (1-5): negocio 5 | risco tecnico 4 | risco seguranca 5 | manutencao 3 | escala/performance 2 | tempo 2 | reversibilidade 2
- Classificacao: **Bloqueada** para bypass; plano alternativo: liberar somente escopo nao sensivel via feature flag e prazo formal de remediacao.

### ADR-SEC-005: Integracoes externas por adapter com validacao criptografica quando disponivel
- Decisao: webhook/integracao de n8n, Evolution e UAZAPI deve passar por adapter dedicado com verificacao de origem, assinatura/token e normalizacao de payload.
- Alternativas consideradas: consumo direto de payload externo em service.
- Justificativa: reduz spoofing, injecao de payload e acoplamento com provider.
- Avaliacao (1-5): negocio 4 | risco tecnico 3 | risco seguranca 5 | manutencao 2 | escala/performance 3 | tempo 3 | reversibilidade 4
- Classificacao: **Aprovada**.

## 4. Plano de implementacao
1. Publicar baseline TIC-23 (este documento) e alinhar owners Security, Backend, QA e DevOps.
2. Classificar endpoints por criticidade (`publico`, `autenticado`, `sensivel`, `administrativo`).
3. Definir matriz RBAC por modulo (Tickets, Chat, Portal Cliente, Projetos, Storage, Settings).
4. Padronizar middleware/guard para auth + autorizacao contextual em services.
5. Exigir rate-limit para rotas de auth, webhook, upload e consultas de alto custo.
6. Instituir logging de auditoria para acoes sensiveis com identificadores de rastreio.
7. Integrar gates de seguranca no CI e checklist obrigatorio de PR high-risk.
8. Executar rollout incremental por dominio, iniciando por `auth`, `customer`, `chat webhook` e `storage`.

Dependencias:
- Matriz de papeis/permissoes validada com Produto/Operacao.
- Ambiente de homologacao com dados representativos para testes de permissao.
- Pipeline com capacidade de executar testes negativos de seguranca.

## 5. Qualidade e testes
- Estrategia minima:
  - Unit: funcoes de auth, policy e validacao de permissao.
  - Integration: services com cenarios permitidos/negados e auditoria.
  - API: cobertura de status `401`, `403`, `429`, contratos de erro e sanitizacao.
  - E2E focal: fluxos criticos com perfil diferente (operador/admin/cliente).
- Criterios minimos (hard gate):
  - `npm run lint` sem erro.
  - `npm test` sem falha em suites criticas de seguranca.
  - `npm run build` sem erro.
  - PR sensivel com testes negativos obrigatorios (acesso sem permissao, token invalido, abuso de taxa).

## 6. Seguranca
- Riscos principais:
  - bypass de autenticacao/autorizacao em rota sensivel;
  - escalacao de privilegio por regra RBAC inconsistente;
  - webhook aceitando payload sem verificacao de origem;
  - vazamento de PII/segredo em log ou payload de erro;
  - abuso de endpoint sem limitacao de taxa.
- Controles obrigatorios:
  - autenticacao forte e expiracao de sessao/token;
  - RBAC centralizado com principio do menor privilegio;
  - rate-limit e protecao anti-bruteforce em auth e webhooks;
  - auditoria estruturada para mutacoes criticas;
  - redacao/mascaramento de dados sensiveis em logs;
  - gestao de segredos por variavel de ambiente e rotacao controlada.

## 7. Observabilidade
- Logs estruturados:
  - `timestamp`, `traceId`, `actorId`, `module`, `action`, `resourceId`, `status`, `decision`.
- Metricas:
  - taxa de `401/403/429` por endpoint;
  - falhas de validacao de assinatura de webhook;
  - tentativas de acesso negadas por perfil;
  - tempo de resposta p95 em endpoints sensiveis;
  - cobertura de auditoria em mutacoes criticas.
- Tracing:
  - correlacao request -> service -> adapter externo -> persistencia de auditoria.
- Health checks:
  - `/api/health` com sinalizacao minima de DB e dependencias criticas de seguranca (quando aplicavel).

## 8. Riscos tecnicos e mitigacao
- Risco: regra de permissao duplicada e divergente.
  - Mitigacao: centralizar policies em service layer e bloquear nova duplicacao em review.
- Risco: falso senso de seguranca por testes superficiais.
  - Mitigacao: obrigar testes negativos e cenarios de escalacao de privilegio.
- Risco: impacto de latencia por controles adicionais.
  - Mitigacao: medicao p95/p99, cache de contexto de permissao quando seguro e tuning incremental.
- Risco: integracao externa sem verificador robusto.
  - Mitigacao: adapter unico por provider + segredo dedicado + replay protection quando possivel.

## 9. Plano de rollback
1. Reverter deploy para ultima versao estavel com gates de seguranca aprovados.
2. Desativar feature sensivel por flag quando rollback total nao for viavel.
3. Reverter alteracoes de permissao/policy para baseline conhecida.
4. Em caso de migration associada, executar plano TIC-21 (rollback seguro ou compatibilidade forward).
5. Validar pos-rollback: auth, permissao, auditoria e health checks.

## 10. Criterios de pronto (DoD tecnico)
- Tipagem/build sem erro.
- Testes criticos passando.
- Contratos de API consistentes e versionaveis.
- Validacoes de seguranca aplicadas (auth/RBAC/rate-limit/audit quando aplicavel).
- Migracao de banco segura e reversivel (quando houver impacto estrutural).
- Observabilidade minima implementada (logs estruturados, metricas e traceId).
- Documentacao tecnica essencial atualizada (governanca, matriz RBAC, riscos residuais).

## 11. Handoff por agente
- Backend
  - Entrada: matriz RBAC, contratos de endpoint e classificacao de risco.
  - Saida: services com policy centralizada, rotas finas, testes e auditoria.
- Frontend
  - Entrada: contrato de permissao por acao/tela e codigos de erro padrao.
  - Saida: guardas de interface, ocultacao de acao indevida e tratamento de erro seguro.
- DB
  - Entrada: impacto em entidades de identidade/auditoria/permissao.
  - Saida: migration segura, constraints e plano de compatibilidade.
- QA
  - Entrada: diff, matriz de risco e criterios de seguranca.
  - Saida: evidencias unit/integration/api/e2e, incluindo testes negativos.
- Security
  - Entrada: endpoints alterados, dados sensiveis, integracoes externas.
  - Saida: parecer de risco residual, controles obrigatorios e decisao de gate.
- DevOps
  - Entrada: requisitos de CI/CD, segredos, observabilidade e rollback.
  - Saida: pipeline com gates de seguranca, alertas e runbook atualizado.

## Gate checklist obrigatorio (security PR)
- Classificacao de risco preenchida (`low|medium|high`) com justificativa.
- Evidencia de auth e RBAC para endpoints sensiveis alterados.
- Evidencia de rate-limit em auth/webhook/upload quando aplicavel.
- Evidencia de auditoria para acoes administrativas/mutacoes criticas.
- Logs sem vazamento de dados sensiveis (redacao validada).
- Testes negativos de seguranca anexados no PR.
- Parecer Security registrado antes de decisao final CTO.

## Framework de decisao tecnica (uso obrigatorio em toda decisao de seguranca)
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
- **Aprovada com ressalvas**: valor claro, mas exige mitigacoes com owner e prazo.
- **Bloqueada**: risco nao aceitavel sem contramedidas; deve incluir plano alternativo.

## Entregavel semanal esperado (ritual CTO)
- Status de arquitetura de seguranca e hotspots da semana.
- Qualidade por gate (`PASS|FAIL|PARTIAL|BLOCKED`).
- Riscos criticos de seguranca com owner e prazo de mitigacao.
- Divida tecnica de seguranca priorizada (top 5).
- Plano tecnico da proxima semana com sequenciamento por agentes.
