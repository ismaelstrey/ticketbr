# TIC-20 - Frontend Governance Gate Definition (TicketBR)

## 1. Resumo tecnico executivo
- Objetivo: definir governanca tecnica obrigatoria para mudancas frontend, com gates que reduzam regressao visual/funcional, risco de seguranca e dependencias instaveis de API.
- Contexto: frontend TicketBR em Next.js (App Router) com modulos criticos (Tickets/Kanban, Chat, Portal Cliente, Projetos/Tarefas, Storage) e forte dependencia de contratos HTTP.
- Impacto: maior previsibilidade de release, menor retrabalho entre frontend/backend e reducao de incidentes por quebra de contrato ou regressao de UX critica.

## 2. Arquitetura proposta
- Componentes afetados:
  - `src/app/**/page.tsx`: composicao de tela.
  - `src/components/**`: UI, layout e fluxos de interacao.
  - `src/hooks/**`: logica de estado de interface e integracao.
  - `src/services/api.ts`: cliente HTTP e padroes de chamada.
  - `src/types/**`: contratos tipados de dominio.
  - `src/context/**`: estado global de sessao, tema e auth.
- Limites de responsabilidade:
  - Page/route UI: orquestracao de componentes e roteamento.
  - Componentes: renderizacao + interacao local, sem regra de negocio critica.
  - Hooks: regras de estado e sequenciamento de chamadas.
  - Services/api: acesso a backend e normalizacao de erro/retry.
  - Types: fonte unica de contrato frontend.
- Fluxo de governanca:
  - PR frontend -> gates automatizados (tipagem, testes, build) -> validacao de contrato com API -> validacao de seguranca cliente -> decisao CTO (`Aprovada | Aprovada com ressalvas | Bloqueada`).

## 3. Decisoes tecnicas (ADRs resumidas)

### ADR-FE-001: Contract-first para consumo de API
- Decisao: toda chamada HTTP nova ou alterada deve passar por schema tipado/versionado em `src/types/**` + parser/normalizacao no cliente.
- Alternativas consideradas: consumo ad-hoc por componente.
- Justificativa: evita drift de contrato e reduz bug em runtime.
- Avaliacao (1-5): negocio 5 | risco tecnico 2 | risco seguranca 2 | manutencao 2 | escala/performance 3 | tempo 3 | reversibilidade 4
- Classificacao: **Aprovada**.

### ADR-FE-002: Camada de servico unica para I/O remoto
- Decisao: proibido fetch direto em componentes para fluxos criticos; usar `src/services/api.ts` ou wrapper dedicado.
- Alternativas consideradas: chamadas distribuidas por tela.
- Justificativa: centraliza retry, tratamento de erro e telemetria.
- Avaliacao (1-5): negocio 4 | risco tecnico 2 | risco seguranca 2 | manutencao 1 | escala/performance 3 | tempo 2 | reversibilidade 5
- Classificacao: **Aprovada**.

### ADR-FE-003: Gate de acessibilidade e regressao visual em fluxos criticos
- Decisao: exigir testes de acessibilidade basica e regressao de componentes-chave (Kanban, Chat, Portal Cliente, Projetos).
- Alternativas consideradas: validacao manual em QA.
- Justificativa: reduz incidentes de UX e quebra silenciosa de interacao.
- Avaliacao (1-5): negocio 4 | risco tecnico 3 | risco seguranca 1 | manutencao 3 | escala/performance 2 | tempo 3 | reversibilidade 4
- Classificacao: **Aprovada com ressalvas** (ressalva: rollout gradual por modulo para nao bloquear throughput inicial).

### ADR-FE-004: Bloqueio de release sem evidencias minimas de seguranca cliente
- Decisao: telas e fluxos sensiveis devem comprovar guardas de autenticacao, checks de permissao e redacao de dados sensiveis em logs/toasts.
- Alternativas consideradas: ajustar seguranca apos release.
- Justificativa: risco de exposicao de dados e acoes indevidas.
- Avaliacao (1-5): negocio 5 | risco tecnico 4 | risco seguranca 5 | manutencao 3 | escala/performance 2 | tempo 2 | reversibilidade 2
- Classificacao: **Bloqueada** para bypass. Plano alternativo: liberar somente escopo nao sensivel por feature flag.

## 4. Plano de implementacao
1. Publicar este baseline e alinhar owners por modulo frontend.
2. Padronizar contratos de resposta/erro no cliente (`src/types` + `src/services/api.ts`).
3. Mapear fluxos criticos e suites obrigatorias (unit/integration/e2e/a11y).
4. Integrar gates no CI (typecheck -> testes criticos -> build -> evidencias).
5. Adicionar checklist de PR frontend (contrato, seguranca, observabilidade, rollback).
6. Rodar piloto em modulo Projetos e escalar para Tickets/Kanban e Chat.

Dependencias:
- Contratos backend minimamente estaveis por dominio.
- Ambiente de teste para e2e dos fluxos criticos.
- Owners de QA/Security disponiveis em mudancas high risk.

## 5. Qualidade e testes
- Estrategia minima:
  - Unit: componentes puros, hooks e utilitarios de formatacao/estado.
  - Integration: componentes com contexto + cliente API mockado.
  - API contract: validacao de payload esperado/erro esperado por modulo.
  - E2E: login, navegacao principal, operacoes criticas (Kanban move, envio chat, abertura ticket cliente, criar/editar projeto).
- Criterios minimos (hard gate):
  - `npm run lint` sem erro.
  - `npm test` com suites criticas verdes.
  - `npm run build` sem erro.
  - PR com alteracao de fluxo critico deve incluir/atualizar teste correspondente.

## 6. Seguranca
- Riscos principais:
  - renderizacao de dados sensiveis sem controle de permissao;
  - acao de escrita exposta em UI para perfil nao autorizado;
  - tokens/sessoes manipulados fora de fluxo seguro;
  - mensagens de erro com vazamento de detalhes internos.
- Controles obrigatorios:
  - guardas de auth e checks de perfil antes de acao sensivel;
  - consumo de sessao centralizado em contexto seguro;
  - sanitizacao de payload exibido em UI (chat/comentarios/campos livres);
  - mascaramento de dados pessoais em logs/toasts quando aplicavel.

## 7. Observabilidade
- Logs cliente (estruturados): `traceId`, `route`, `module`, `action`, `httpStatus`, `durationMs`.
- Metricas frontend:
  - erro JS por modulo;
  - latencia de chamada critica (p95);
  - taxa de falha por endpoint consumido;
  - taxa de abandono em fluxo critico.
- Tracing:
  - correlacao de `traceId` frontend -> API backend para incidentes.
- Health checks:
  - pagina de status funcional (`/api/health`) validada no boot da app para surface de alerta.

## 8. Riscos tecnicos e mitigacao
- Risco: duplicacao de regra em componente e hook.
  - Mitigacao: extrair para hook/service compartilhado e revisar por arquitetura.
- Risco: drift de contrato com backend.
  - Mitigacao: tipagem unica em `src/types` + testes de contrato por endpoint critico.
- Risco: degradacao de performance por re-render excessivo.
  - Mitigacao: memoizacao orientada a medicao e budget de render por pagina critica.
- Risco: cobertura baixa de fluxos de alta receita/operacao.
  - Mitigacao: obrigatoriedade de e2e para fluxos criticos antes de merge.

## 9. Plano de rollback
1. Reverter deploy para build frontend anterior estavel.
2. Desativar feature por flag quando houver risco localizado.
3. Manter compatibilidade de contrato (nao remover campo consumido sem janela de transicao).
4. Validar navegacao, auth e fluxos criticos apos rollback.
5. Registrar incidente e acao preventiva no backlog tecnico.

## 10. Criterios de pronto (DoD tecnico)
- Tipagem/build sem erro.
- Testes criticos passando.
- Contratos de API consistentes e versionaveis.
- Validacoes de seguranca aplicadas (auth/RBAC/rate-limit/audit quando aplicavel ao fluxo).
- Observabilidade minima ativa (logs estruturados + metricas basicas + correlacao por traceId).
- Documentacao tecnica essencial atualizada.

## 11. Handoff por agente
- Backend
  - Entrada: endpoints alterados, schemas esperados, codigos de erro.
  - Saida: contrato estavel/versionado e changelog de API.
- Frontend
  - Entrada: contrato API, requisitos UX e matriz de permissao.
  - Saida: UI implementada com testes e telemetria minima.
- DB
  - Entrada: impacto de payload/consulta que afeta UX.
  - Saida: validacao de compatibilidade de dados e cardinalidade esperada.
- QA
  - Entrada: diff, criterios de aceite, fluxos criticos.
  - Saida: evidencia unit/integration/e2e + parecer de risco.
- Security
  - Entrada: mudancas de auth/perfil/dados sensiveis.
  - Saida: validacao de controles cliente e risco residual.
- DevOps
  - Entrada: requisitos de pipeline, build e observabilidade.
  - Saida: gates automatizados, artefatos de CI e runbook de rollback.

## Gate checklist obrigatorio (frontend PR)
- Tipagem, lint e build verdes.
- Testes criticos atualizados e passando.
- Contrato API documentado e tipado.
- Fluxos sensiveis com validacao de permissao.
- Telemetria minima e trilha de erro reproduzivel.
- Evidencias anexadas no PR (logs de CI e relatorio de teste).

