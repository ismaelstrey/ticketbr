# TIC-44 - Trilha Security TicketBR: Baseline de Seguranca e Conformidade Tecnica

## 1. Resumo tecnico executivo

- Objetivo: estabelecer baseline obrigatoria de seguranca/compliance para todo o fluxo TicketBR (API, dominio, dados, integracoes e operacao).
- Contexto: stack Next.js fullstack + Prisma com modulos criticos (Tickets/Kanban, Chat/WhatsApp, Portal Cliente, Projetos/Tarefas, Storage) e multiplas integracoes externas.
- Impacto no negocio: reduz risco de incidente e regressao em release, melhora previsibilidade de deploy e reduz custo de suporte/rollback.
- Evidencia atual (execucao local em 2026-04-16):
  - `prisma:validate`: PASS
  - `prisma:generate`: PASS
  - `lint` (tsc): PASS
  - `test` (vitest): PASS (54 arquivos / 126 testes)
  - `build`: PASS apos ajuste tecnico em health route

## 2. Arquitetura proposta

### Componentes afetados

- `src/proxy.ts`: autenticacao e controles globais de entrada HTTP.
- `src/lib/auth.ts`: emissao/validacao de sessao JWT e cookie de sessao.
- `src/lib/rateLimit.ts`: rate-limit baseline (auth e endpoints sensiveis).
- `src/server/services/audit-log.ts`: trilha de auditoria estruturada.
- `src/app/api/**`: rotas finas, validacao de entrada e delegacao para services/use-cases.
- `prisma/schema.prisma` + `prisma/migrations/*`: RBAC, auditoria e governanca de dados.
- `.github/workflows/ci.yml`: gates de qualidade, seguranca e release readiness.

### Limites de responsabilidade

- API Route: authn basica, validacao de schema/contrato, chamada de service.
- Service/Use-case: regra de negocio, autorizacao contextual, idempotencia, auditoria.
- Adapter: encapsular dependencias externas (n8n, Evolution, UAZAPI, Storage).
- Persistencia: Prisma com migrations reversiveis e compatibilidade controlada.

### Fluxo baseline (obrigatorio)

1. Request entra com `x-request-id`.
2. Authn via sessao JWT em cookie httpOnly.
3. Authz via RBAC contextual (role + ownership + escopo).
4. Rate-limit em rotas sensiveis.
5. Service executa regra de negocio e chama adapters externos desacoplados.
6. Auditoria registra acao sensivel com ator, alvo e metadata.
7. Logs estruturados + metricas + healthcheck alimentam operacao.

## 3. Decisoes tecnicas (ADRs resumidas)

### ADR-44-01 - RBAC centralizado em policy layer

- Decisao: `Aprovada`.
- Alternativas: validacao RBAC inline por rota; RBAC somente em middleware.
- Justificativa: RBAC inline gera duplicacao e drift; middleware isolado nao cobre ownership/escopo de dominio.
- Avaliacao (framework de decisao):
  - Impacto negocio/produto: Alto positivo
  - Risco tecnico: Medio (refatoracao gradual)
  - Risco seguranca/compliance: Alto positivo
  - Custo manutencao: Baixo/Medio
  - Escalabilidade/performance: Positivo
  - Tempo implementacao: Medio
  - Reversibilidade: Alta (feature-flag + rollout por dominio)

### ADR-44-02 - Auditoria obrigatoria para mutacoes sensiveis

- Decisao: `Aprovada com ressalvas`.
- Alternativas: auditoria parcial por modulo; logs sem persistencia.
- Justificativa: cobertura total aumenta conformidade; ressalva para evitar vazamento de PII/tokens em metadata.
- Avaliacao:
  - Impacto negocio/produto: Alto positivo
  - Risco tecnico: Baixo/Medio
  - Risco seguranca/compliance: Alto positivo
  - Custo manutencao: Medio
  - Escalabilidade/performance: Medio (exige indice/retencao)
  - Tempo implementacao: Medio
  - Reversibilidade: Alta

### ADR-44-03 - Rate-limit distribuido para producao

- Decisao: `Bloqueada` para continuar somente com armazenamento em memoria.
- Alternativas: manter limiter in-memory; migrar para backend distribuido (Redis/Upstash).
- Justificativa: limiter em memoria nao protege de forma consistente em multiplas instancias/pods.
- Plano alternativo: implementar adapter de rate-limit distribuido e manter fallback local apenas para dev/test.
- Avaliacao:
  - Impacto negocio/produto: Alto positivo
  - Risco tecnico: Medio
  - Risco seguranca/compliance: Alto positivo
  - Custo manutencao: Medio
  - Escalabilidade/performance: Alto positivo
  - Tempo implementacao: Baixo/Medio
  - Reversibilidade: Alta (adapter + feature flag)

### ADR-44-04 - Padrao de segredo e criptografia de configuracoes

- Decisao: `Aprovada com ressalvas`.
- Alternativas: manter segredo em cookie/config sem envelope central; centralizar com encryption + rotacao.
- Justificativa: integracoes (n8n/Evolution/UAZAPI/Storage) exigem protecao consistente de credenciais.
- Ressalvas: definir calendario de rotacao e mascaramento obrigatorio em logs.
- Avaliacao:
  - Impacto negocio/produto: Alto positivo
  - Risco tecnico: Medio
  - Risco seguranca/compliance: Alto positivo
  - Custo manutencao: Medio
  - Escalabilidade/performance: Neutro
  - Tempo implementacao: Medio
  - Reversibilidade: Media/Alta

## 4. Plano de implementacao

### Fase 0 (D0-D2) - Baseline e freeze de risco

1. Publicar matriz RBAC por modulo/acao.
2. Inventariar endpoints sensiveis e mapear lacunas de auth/RBAC/rate-limit/audit.
3. Congelar mudancas high-risk sem evidencias de teste e seguranca.

### Fase 1 (D3-D10) - Controles tecnicos minimos

1. Extrair policy layer de autorizacao para services/use-cases.
2. Padronizar middleware/guard de autenticacao e identidade.
3. Implantar rate-limit em auth, webhooks e uploads.
4. Enforcar auditoria obrigatoria com schema de evento padrao.

### Fase 2 (D11-D20) - Integracoes e dados

1. Hardening de adapters externos (timeouts, retries, idempotencia, circuit-break parcial).
2. Segredo/config: criptografia, mascaramento, rotacao.
3. Revisao de migrations para compatibilidade forward/backward + rollback ensaiado.

### Fase 3 (D21-D30) - Operacao e compliance

1. Dashboards de seguranca/qualidade por gate.
2. Alertas de anomalia (auth failures, spikes de 429/403/5xx, falhas de webhook).
3. Runbooks de incidente + exercicio de rollback.

## 5. Qualidade e testes

### Estrategia minima

- Unit: auth, policies RBAC, rate-limit, redacao de logs, adapters.
- Integration: services com cenarios `allow/deny` + escrita de auditoria.
- API: contrato HTTP (status, payload, erro), headers de seguranca e limites.
- E2E focal: login, acesso por perfil, acoes sensiveis (storage/admin/export), webhooks.

### Criterios minimos por gate

- Build/tipagem: PASS.
- Testes criticos: PASS.
- Contrato API: validado e versionavel.
- Seguranca: auth/RBAC/rate-limit/audit aplicados quando exigidos.
- Migration: segura, reversivel, com plano de compatibilidade.

## 6. Seguranca

### Riscos prioritarios

- Escalada de privilegio por RBAC duplicado/inconsistente.
- Rate-limit in-memory em ambiente distribuido.
- Exposicao acidental de segredo em logs/metadata.
- Lacunas de auditoria em mutacoes administrativas.

### Controles e validacoes obrigatorios

- Authn central + authz contextual por policy.
- Rate-limit distribuido em producao.
- Sanitizacao/masking de dados sensiveis em logs.
- Auditoria estruturada para mutacoes de alto impacto.
- Revisao Security mandataria em PR high-risk.

## 7. Observabilidade

- Logs estruturados por request (`x-request-id`, ator, acao, entidade, resultado, latencia).
- Metricas:
  - `http_requests_total` por status/rota.
  - `http_request_duration_ms` p95/p99.
  - `auth_failures_total`, `rbac_denied_total`, `rate_limit_blocked_total`.
  - `audit_log_write_failures_total`.
- Tracing: correlacao request -> service -> adapter externo -> persistencia.
- Health checks:
  - `/api/health` com estado de dependencias e latencia.
  - readiness/liveness em ambiente alvo.

## 8. Riscos tecnicos e mitigacao

- Risco: acoplamento atual de autorizacao em rotas.
  - Mitigacao: extracao incremental para policy layer por dominio.
- Risco: regressao funcional durante hardening.
  - Mitigacao: rollout por modulo com feature flags e testes de regressao focal.
- Risco: custo de observabilidade crescer sem padrao.
  - Mitigacao: schema unico de log/evento e dashboard padronizado.

## 9. Plano de rollback

1. Rollback de codigo por release anterior estavel.
2. Rollback de migration (quando aplicavel) ou estrategia de compatibilidade forward/backward.
3. Desativar controles novos via feature flag em caso de degradacao critica.
4. Preservar trilha de auditoria e evidencias de incidente.

## 10. Criterios de pronto (DoD tecnico)

- `npm run prisma:validate` PASS.
- `npm run prisma:generate` PASS.
- `npm run lint` PASS.
- `npm test` PASS.
- `npm run build` PASS.
- Contratos de API atualizados e versionaveis.
- Auth/RBAC/rate-limit/audit aplicados em endpoints sensiveis do escopo.
- Observabilidade minima implantada (logs/metricas/health).
- Documentacao tecnica essencial atualizada.

## 11. Handoff por agente

### Backend

- Entrada: matriz RBAC + inventario de endpoints sensiveis.
- Saida: policy layer, refactor de rotas finas, testes unit/integration/API.

### Frontend

- Entrada: contratos de autorizacao/erros (401/403/429) e eventos de auditoria de UX.
- Saida: tratamento padrao de erro/autorizacao e fluxos e2e criticos.

### DB

- Entrada: diff schema e necessidade de auditoria/RBAC adicional.
- Saida: migrations seguras/reversiveis + indices e plano de rollback.

### QA

- Entrada: matriz de risco por endpoint.
- Saida: evidencias de testes criticos e regressao de seguranca.

### Security

- Entrada: diff de auth/RBAC/integracoes e resultados de teste.
- Saida: parecer `approve | approve-with-conditions | block` e backlog de correcao.

### DevOps

- Entrada: requisitos de gate, observabilidade e rollout.
- Saida: pipeline com bloqueio automatico, dashboards e alertas, estrategia de deploy/rollback.

## Entregavel semanal para Exec Team

- Status de arquitetura e hotspots:
  - Hotspot 1: RBAC ainda parcialmente distribuido entre rotas/services.
  - Hotspot 2: rate-limit em memoria para cenario distribuido.
  - Hotspot 3: padrao unico de auditoria/mascaramento ainda incompleto.
- Qualidade da semana (gates):
  - Build/typing: PASS
  - Testes criticos: PASS
  - Contrato API versionavel: PARCIAL
  - Security baseline: PARCIAL
  - Migration segura/reversivel: PASS (procedimento existente, precisa ensaio recorrente)
  - Observabilidade minima: PASS (com amadurecimento pendente)
- Riscos criticos e mitigacao:
  - rate-limit distribuido pendente (prioridade alta)
  - consolidacao RBAC por policy layer (prioridade alta)
- Divida tecnica priorizada:
  - unificacao de authz e auditoria em services
  - contrato API formal para endpoints sensiveis
  - redacao/masking padrao de dados sensiveis
- Plano tecnico da proxima semana:
  - concluir ADR-44-03 (rate-limit distribuido)
  - fechar matriz RBAC por modulo com enforcement central
  - expandir testes negativos de seguranca (401/403/429/audit)
