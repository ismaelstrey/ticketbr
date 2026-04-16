# TIC-29 / TIC-28 - Escopo Tecnico CTO para AI-CRO (TicketBR)

## 1. Resumo tecnico executivo
- Objetivo: habilitar ciclo AI-CRO orientado por dados reais de uso para aumentar conversao operacional (login -> navegacao -> acao util -> conclusao).
- Contexto: TIC-30 (CMO) e TIC-31 (UX) ja em andamento; TIC-28 depende desta direcao tecnica para iniciar execucao coordenada.
- Impacto esperado: reduzir retrabalho, acelerar tempo ate primeira acao util e elevar taxa de conclusao de fluxos criticos (ticket/tarefa/projeto/portal cliente).

## 2. Arquitetura proposta
- Componentes afetados:
  - Next.js client: emissao de eventos UX padronizados por schema versionado.
  - Next.js API routes: endpoint de ingestao de eventos e endpoint de consulta de insights/recomendacoes.
  - Services/use-cases: `CROEventIngestionService`, `FunnelAggregationService`, `AIInsightService`.
  - Prisma/DB: armazenamento de eventos, sessoes, funis agregados, insights e recomendacoes.
  - Adapters externos: provedor LLM desacoplado por interface (`AIProviderAdapter`) e integracoes de chat/WhatsApp mantidas fora do dominio CRO.
- Limites de responsabilidade:
  - Rotas API finas: validacao de auth/RBAC, contrato, dispatch para service.
  - Regras de negocio e scoring no service/use-case.
  - Persistencia encapsulada em repositorios.
  - UI apenas coleta/consome eventos e recomendacoes; sem regra CRO critica no frontend.
- Fluxo:
  1. Usuario executa acao em fluxo critico.
  2. Frontend emite evento tipado (`event_name`, `schema_version`, `session_id`, `module`, `outcome`).
  3. API valida contrato e grava evento/sessao.
  4. Agregador calcula funis/atritos (batch curto + on-demand para metricas-chave).
  5. `AIInsightService` gera recomendacoes priorizadas por impacto x esforco.
  6. Painel interno exibe insights com evidencia, confianca e acao recomendada.

## 3. Decisoes tecnicas (ADRs resumidas)

### ADR-01 - Contrato de eventos versionado no backend
- Decisao: centralizar schema de eventos no backend (Zod + tipagem TS compartilhada).
- Alternativas: schema livre no frontend; ferramenta externa sem contrato interno.
- Justificativa: evita drift de eventos, facilita auditoria e retrocompatibilidade.
- Classificacao: **Aprovada**.

### ADR-02 - Persistencia inicial em Postgres (Prisma) antes de stack analitica dedicada
- Decisao: iniciar com tabelas dedicadas no banco atual + agregacoes periodicas.
- Alternativas: adotar data warehouse/logo stream completo no inicio.
- Justificativa: menor tempo de implementacao e reversibilidade alta; permite validar valor antes de ampliar custo.
- Classificacao: **Aprovada com ressalvas** (reavaliar em 30 dias com volume real).

### ADR-03 - Geracao de insights por camada assicrona com adapter de LLM
- Decisao: gerar insights via job assicrono (nao bloquear request operacional) e publicar resultado versionado.
- Alternativas: inferencia sincrona em request; regras fixas sem IA.
- Justificativa: protege latencia de operacao critica e reduz risco de indisponibilidade externa.
- Classificacao: **Aprovada com ressalvas** (feature flag + fallback deterministico obrigatorios).

### ADR-04 - Governanca de recomendacao com evidencia rastreavel
- Decisao: toda recomendacao precisa apontar metrica/funil base, janela temporal e confianca.
- Alternativas: recomendacao sem trilha de evidencia.
- Justificativa: evita decisao opaca e reduz risco de acao errada.
- Classificacao: **Aprovada**.

## 4. Plano de implementacao
- Etapa 1: definir taxonomia de eventos e funil alvo (login, navegacao, acao primaria, conclusao).
- Etapa 2: implementar contrato versionado + endpoint ingestao + persistencia Prisma.
- Etapa 3: instrumentar modulos criticos (Tickets/Kanban, Dashboard, Portal Cliente).
- Etapa 4: agregador de funil + metricas baseline (7/14 dias).
- Etapa 5: `AIInsightService` assicrono com adapter, feature flag e fallback.
- Etapa 6: endpoint/painel de insights para consumo execucao TIC-28.
- Dependencias:
  - Definicao final de KPI e funil (CMO/TIC-30).
  - Priorizacao de friccoes e eventos UX (UX/TIC-31).
  - Aprovar politica de retencao e dados sensiveis (Security/CEO).
- Ordem de execucao: 1 -> 2 -> 3 em paralelo parcial com 4; depois 5 -> 6.

## 5. Qualidade e testes
- Unit:
  - validadores de contrato de evento.
  - regras de agregacao de funil e scoring de recomendacao.
- Integration:
  - API ingestao -> service -> repositorio Prisma.
  - pipeline de agregacao e escrita de insight.
- API:
  - testes de contrato versionado e backward compatibility.
  - auth/RBAC para rotas de leitura de insights.
- E2E:
  - fluxos criticos com verificacao de emissao de evento.
  - validacao de visualizacao de insight no painel.
- Criterios minimos:
  - typecheck/build sem erro.
  - testes criticos do funil e ingestao passando.
  - contratos versionados com changelog.

## 6. Seguranca
- Riscos:
  - coleta excessiva de dados sensiveis.
  - acesso indevido a insights entre perfis.
  - abuso de endpoint de ingestao.
- Controles:
  - allowlist de campos permitidos por evento.
  - pseudonimizacao de identificadores de sessao/usuario quando aplicavel.
  - RBAC explicito para leitura de insights e configuracoes.
  - rate-limit e protecao anti-abuso em ingestao.
  - trilha de auditoria para consultas/exports de insights.
- Validacoes:
  - checklist Security Gate para LGPD/data minimization.
  - teste de permissao negativa em endpoints sensiveis.

## 7. Observabilidade
- Logs:
  - `event_ingested`, `event_rejected`, `funnel_aggregated`, `insight_generated`, `insight_failed`.
- Metricas:
  - throughput de eventos/min, taxa de rejeicao por schema, latencia p95 ingestao.
  - tempo de agregacao por janela, cobertura de funil instrumentado.
  - taxa de recomendacoes aceitas/rejeitadas.
- Tracing:
  - trace id por request de ingestao e pipeline assicrono.
- Health checks:
  - endpoint de saude do pipeline CRO e monitor de atraso de jobs.

## 8. Riscos tecnicos e mitigacao
- Risco: baixo sinal inicial por instrumentacao incompleta.
  - Mitigacao: rollout por modulo com cobertura minima obrigatoria antes de analise de IA.
- Risco: custo computacional subir com volume de eventos.
  - Mitigacao: agregacoes incrementais, TTL, reavaliacao de storage em 30 dias.
- Risco: recomendacoes de baixa qualidade no inicio.
  - Mitigacao: fallback deterministico + review humano para mudancas P0/P1.

## 9. Plano de rollback
- Desativar feature flag de insights IA mantendo coleta de eventos.
- Reverter consumidor de insights no frontend para modo observacional.
- Em falha de contrato novo, manter leitura dos schemas anteriores e bloquear apenas eventos invalidos da versao nova.
- Migrações de schema com script reversivel e janela controlada.

## 10. Criterios de pronto (DoD tecnico)
- Contrato de eventos versionado e documentado.
- Endpoints de ingestao/consulta com auth+RBAC+rate-limit.
- Migrations Prisma aplicadas com plano de rollback validado.
- Observabilidade minima (logs/metricas/alertas) ativa.
- Testes criticos (unit/integration/api/e2e alvo) passando.
- Documento tecnico e handoff por agente atualizado.

## 11. Handoff por agente
- Backend:
  - Entrada: taxonomia aprovada + ADRs.
  - Saida: APIs, services, adapters e testes de contrato.
- Frontend:
  - Entrada: contrato de eventos + eventos priorizados.
  - Saida: instrumentacao nos fluxos criticos e consumo seguro de insights.
- DB:
  - Entrada: modelo de evento/funil/insight.
  - Saida: migrations Prisma reversiveis + indice/retencao.
- QA:
  - Entrada: criterios de aceite e contratos.
  - Saida: evidencias de testes criticos e regressao.
- Security:
  - Entrada: mapa de dados/eventos e fluxos de acesso.
  - Saida: parecer de compliance, RBAC, auditabilidade.
- DevOps:
  - Entrada: requisitos de pipeline e observabilidade.
  - Saida: CI/CD gates, dashboards, alertas e health checks.

## Bloqueios concretos para destravar TIC-28 (executivo)
- Decisao cruzada 1 (CMO/UX/CTO): KPI primario oficial da fase 1 (ex.: TTV operacional vs taxa de conclusao de tarefa/ticket).
- Decisao cruzada 2 (Security/CEO): politica de retencao e granularidade de identificadores nos eventos (janela e pseudonimizacao).
- Decisao cruzada 3 (Exec Team): se fase 1 usa apenas stack interna (Prisma) ou exige stack analitica dedicada imediata.

## Proximo passo acionavel
- Reuniao curta de alinhamento TIC-29/TIC-30/TIC-31 (30 min) para fechar 3 decisoes acima e congelar `event taxonomy v1`.
- Apos esse alinhamento: abrir execucao tecnica em PR-1 (contrato+ingestao) no mesmo dia.
