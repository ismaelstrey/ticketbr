# TIC-19 - Backend Governance Gate Definition (TicketBR)

## 1. Resumo tecnico executivo
- Objetivo: instituir um fluxo de governanca backend com gates obrigatorios para reduzir regressao, vulnerabilidade e falhas de release.
- Contexto: TicketBR opera em Next.js fullstack com Prisma, integracoes externas (n8n, Evolution, UAZAPI) e modulos criticos (Tickets, Chat, Portal, Projetos, Storage).
- Impacto: melhora previsibilidade de entrega, padroniza aprovacao tecnica e reduz risco operacional em mudancas de API, schema e integracoes.

## 2. Arquitetura proposta
- Componentes afetados:
  - `src/app/api/**`: camada de transporte (rotas finas).
  - `src/server/services/**`: regras de negocio/use-cases.
  - `src/lib/**`: cross-cutting (auth, rate-limit, validacao, prisma).
  - `prisma/schema.prisma` + migrations: contrato de dados.
  - `.github/workflows/ci.yml`: enforce de gates automatizados.
- Limites de responsabilidade:
  - API route: parse/validate/auth basic + chamada de service.
  - Service/use-case: regra de negocio, orchestration e politicas.
  - Adapter: isolamento de provider externo (n8n/Evolution/UAZAPI/S3).
  - Prisma: persistencia e transacao, sem regra de apresentacao.
- Fluxo:
  - PR aberta -> CI executa gates -> QA/Security evidenciam riscos -> CTO decide `Aprovada | Aprovada com ressalvas | Bloqueada`.

## 3. Decisoes tecnicas (ADRs resumidas)

### ADR-GB-001: Pipeline por gates obrigatorios
- Decisao: todo PR backend passa por gates sequenciais e bloqueantes.
- Alternativas consideradas: revisao manual por checklist sem automacao.
- Justificativa: automacao reduz variabilidade e erro humano.
- Classificacao: **Aprovada**.

### ADR-GB-002: Rotas finas com services obrigatorios para regra critica
- Decisao: regras de dominio e integracao externa devem residir em `src/server/services`.
- Alternativas consideradas: manter logica distribuida em handlers de rota.
- Justificativa: reduz duplicacao e acoplamento, facilita testes.
- Classificacao: **Aprovada**.

### ADR-GB-003: Mudanca de schema com estrategia expand/contract
- Decisao: schema change exige migration reversivel + compatibilidade transitoria.
- Alternativas consideradas: alteracao direta sem janela de compatibilidade.
- Justificativa: evita indisponibilidade e quebra de contrato.
- Classificacao: **Aprovada com ressalvas** (ressalva: acelerar com feature flags quando necessario).

### ADR-GB-004: Release bloqueada sem evidencias minimas de seguranca
- Decisao: auth/RBAC/rate-limit/audit sao criterio hard gate para endpoints sensiveis.
- Alternativas consideradas: aceitar risco com follow-up pos-release.
- Justificativa: risco de compliance e incidente e maior que ganho de prazo.
- Classificacao: **Bloqueada** para bypass; caminho alternativo: hotfix com escopo reduzido e mitigacao documentada.

## 4. Plano de implementacao
1. Publicar baseline de governanca backend (este documento) e socializar com agentes.
2. Mapear APIs criticas por dominio (`tickets`, `chat`, `customer`, `projects`, `storage`, `auth`).
3. Vincular cada dominio a bateria minima de testes (unit + integration/API).
4. Fortalecer CI para executar gates em ordem de risco (typing -> testes -> build).
5. Definir checklist de migracao Prisma com rollback e compatibilidade.
6. Exigir evidencias de seguranca para PRs com auth/integracao externa.
7. Instituir rito de aprovacao CTO baseado no framework de decisao tecnica.

Dependencias:
- Base de testes confiavel por dominio.
- Contratos de API versionaveis para endpoints criticos.
- Responsavel por seguranca disponivel no fluxo de review.

## 5. Qualidade e testes
- Estrategia minima:
  - Unit: regras puras em `src/lib` e `src/server/services`.
  - Integration: services com banco/adapters mockados ou controlados.
  - API: validacao de status, contrato de resposta e cenarios de erro.
  - E2E (foco): fluxos criticos (tickets/kanban, chat inbound/outbound, portal cliente).
- Criterios minimos (hard gate):
  - `npm run lint` sem erro.
  - `npm test` sem falhas em suites criticas.
  - `npm run build` sem erro.
  - Mudancas criticas com testes novos/ajustados no mesmo PR.

## 6. Seguranca
- Riscos principais:
  - bypass de autenticacao/autorizacao;
  - webhook sem validacao forte;
  - exposicao de dados sensiveis em log;
  - abuso de endpoints sem rate-limit.
- Controles obrigatorios:
  - AuthN/AuthZ em rota e service quando aplicavel.
  - RBAC com matriz por modulo sensivel.
  - Rate-limit para auth, inbound webhook e endpoints de alto custo.
  - Audit trail para acoes administrativas e alteracoes sensiveis.
  - Segredos e chaves via variaveis de ambiente, sem hardcode.

## 7. Observabilidade
- Logs: estruturados com `traceId`, `userId`, `route`, `status`, `durationMs`, `provider`.
- Metricas:
  - taxa de erro por modulo;
  - latencia p95/p99 em APIs criticas;
  - falhas por provider externo (n8n/Evolution/UAZAPI/S3);
  - sucesso/falha de jobs de migration/deploy.
- Tracing: correlacao request -> service -> adapter externo.
- Health checks:
  - `/api/health` com dependencia de DB e providers essenciais quando aplicavel.

## 8. Riscos tecnicos e mitigacao
- Risco: logica duplicada entre rotas.
  - Mitigacao: extração obrigatoria para service/use-case e review arquitetural.
- Risco: acoplamento com provider externo.
  - Mitigacao: adapters/interface + testes de contrato.
- Risco: migration destrutiva.
  - Mitigacao: expand/contract, backup e rollback testado.
- Risco: CI verde sem cobrir caminho critico.
  - Mitigacao: suite critica curada por dominio e gate de cobertura de cenarios-chave.

## 9. Plano de rollback
1. Identificar versao/commit estavel anterior.
2. Reverter deploy de app para ultima release valida.
3. Executar rollback de schema somente se migration for reversivel e segura.
4. Se rollback de schema nao for seguro, manter compatibilidade forward e desabilitar feature por flag.
5. Validar health checks e trilha de auditoria pos-rollback.

## 10. Criterios de pronto (DoD tecnico)
- Tipagem/build sem erro.
- Testes criticos passando.
- Contrato API consistente e versionavel.
- Validacoes de seguranca aplicadas (auth/RBAC/rate-limit/audit quando aplicavel).
- Migration de banco segura e reversivel (ou plano de compatibilidade documentado).
- Observabilidade minima ativa (log estruturado + metricas basicas + health).
- Documentacao tecnica essencial atualizada.

## 11. Handoff por agente
- Backend
  - Entrada: ADR, contrato API, escopo do dominio.
  - Saida: implementacao em services + rotas finas + testes + notas de migration.
- Frontend
  - Entrada: contrato API versionado, cenarios de erro padrao.
  - Saida: integracao sem dependencias ocultas, fallback UX para erros.
- DB
  - Entrada: proposta de schema change + volume esperado.
  - Saida: migration, plano expand/contract, rollback validado.
- QA
  - Entrada: diff, criterios de aceite, matriz de risco.
  - Saida: evidencias unit/integration/api/e2e e parecer de risco.
- Security
  - Entrada: endpoints tocados, dados sensiveis, integracoes externas.
  - Saida: validacao de auth/RBAC/audit/rate-limit e riscos residuais.
- DevOps
  - Entrada: necessidades de pipeline, observabilidade e release.
  - Saida: gates no CI/CD, alertas, dashboard e runbook de rollback.

## Framework de decisao tecnica (uso obrigatorio em toda decisao)
Para cada mudanca estrutural, registrar nota 1-5 em:
1. Impacto no negocio/produto
2. Risco tecnico
3. Risco de seguranca/compliance
4. Custo de manutencao
5. Escalabilidade/performance
6. Tempo de implementacao
7. Reversibilidade

Regra de decisao:
- **Aprovada**: alto impacto + risco controlado + rollback claro.
- **Aprovada com ressalvas**: valor claro, mas exige mitigacoes com prazo e owner.
- **Bloqueada**: risco nao aceitavel sem contramedidas; deve sair com plano alternativo.

## Entregavel semanal esperado (ritual CTO)
- Status da arquitetura e hotspots tecnicos.
- Qualidade da semana por gate (`PASS|FAIL|PARTIAL|BLOCKED`).
- Riscos criticos + mitigacao.
- Divida tecnica priorizada.
- Plano tecnico da proxima semana.

## Orquestracao recomendada para demandas backend de alto impacto
1. Architectura (CTO/Arquitetura): define ADR e contratos.
2. Backend + DB (paralelo): implementacao service + migration segura.
3. QA + Security (paralelo): evidencia funcional e controles.
4. DevOps: valida pipeline/observabilidade/release candidate.
5. CTO: decisao final de go/no-go com base nos gates.
