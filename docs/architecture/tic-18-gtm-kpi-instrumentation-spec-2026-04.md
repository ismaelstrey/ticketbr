# TIC-18: Especificacao Tecnica de Instrumentacao KPI GTM (Revisao Quinzenal)

Data: 2026-04-17  
Owner: CTO  
Dependencias: [TICA-2](/TICA/issues/TICA-2), [TICA-4](/TICA/issues/TICA-4#document-plan), [TICA-17](/TICA/issues/TICA-17)

## Objetivo
Garantir medicao tecnica confiavel para os KPIs do GTM fase 1 e suportar o rito quinzenal do comercial com fontes de verdade unificadas.

## Escopo tecnico
- Definir eventos obrigatorios e payload minimo para o funil GTM.
- Definir dicionario tecnico para CAC, conversoes por etapa, ativacao 14 dias, TTFV, payback e novo MRR.
- Definir rotina quinzenal de consistencia dos dados.
- Definir handoff operacional CTO <-> CMO para [TICA-17](/TICA/issues/TICA-17).

## Fontes de verdade
- Produto (eventos): tracking server-side e cliente com timestamp UTC.
- CRM/Comercial: leads, MQL, SQL, oportunidades e clientes ganhos.
- Midia paga: custo por canal/campanha (Google, Meta, etc).
- Financeiro/Receita: MRR novo por conta e data de inicio da receita.

Regra geral: para metricas de funil e receita, prevalece o dado reconciliado no dataset analitico diario. Divergencias entre ferramentas sao resolvidas pela rotina de consistencia descrita abaixo.

## Mapa de eventos (minimo obrigatorio)

### 1) Aquisicao e lead
- `gtm_session_started`
  - quando: inicio de sessao elegivel (LP, site principal, campanha)
  - chaves: `event_id`, `occurred_at`, `anonymous_id`, `session_id`, `channel`, `source`, `medium`, `campaign`, `landing_path`
- `gtm_lead_captured`
  - quando: formulario enviado / lead criado
  - chaves: `event_id`, `occurred_at`, `lead_id`, `session_id`, `channel`, `campaign`, `persona`, `company_size_band`

### 2) Qualificacao e pipeline
- `gtm_mql_marked`
  - quando: lead atinge criterio MQL
  - chaves: `event_id`, `occurred_at`, `lead_id`, `mql_reason`, `score`, `owner_id`
- `gtm_sql_marked`
  - quando: Sales aceita lead como SQL
  - chaves: `event_id`, `occurred_at`, `lead_id`, `sql_reason`, `owner_id`
- `gtm_opportunity_created`
  - quando: oportunidade criada
  - chaves: `event_id`, `occurred_at`, `opportunity_id`, `lead_id`, `pipeline_stage`, `expected_mrr`, `owner_id`
- `gtm_customer_won`
  - quando: oportunidade ganha
  - chaves: `event_id`, `occurred_at`, `customer_id`, `opportunity_id`, `won_mrr`, `contract_start_date`

### 3) Ativacao e valor
- `product_activation_completed`
  - quando: conta atinge criterio de ativacao tecnica
  - criterio v1: >=1 projeto ativo + >=1 ticket resolvido + >=1 canal conectado dentro de 14 dias
  - chaves: `event_id`, `occurred_at`, `account_id`, `activation_day`, `days_since_won`, `activation_version`
- `product_first_value_reached`
  - quando: primeiro valor entregue (TTFV)
  - criterio v1: primeiro ticket resolvido em fluxo operacional completo
  - chaves: `event_id`, `occurred_at`, `account_id`, `ttfv_hours`, `workflow_type`

### 4) Custos
- `marketing_cost_booked`
  - quando: custo diario de campanha consolidado
  - chaves: `event_id`, `occurred_at`, `cost_date`, `channel`, `campaign`, `amount_brl`, `currency`, `source_system`

## Dicionario tecnico de metricas

### CAC (canal e blended)
- definicao: custo de aquisicao dividido por novos clientes ganhos no periodo.
- formula: `CAC = sum(marketing_cost) / count(distinct customer_won)`
- cortes: `channel`, `campaign`, `period`.
- fonte primaria: `marketing_cost_booked` + `gtm_customer_won`.
- frequencia: quinzenal (com fechamento diario para monitoramento).

### Conversao por etapa
- definicao: taxa de passagem entre estagios do funil.
- formulas:
  - `visit_to_lead = leads / sessions`
  - `lead_to_mql = mql / leads`
  - `mql_to_sql = sql / mql`
  - `sql_to_customer = won / sql`
- fonte primaria: eventos `gtm_*` reconciliados com CRM.
- janela padrao: 14 dias moveis para decisao quinzenal.

### Ativacao em 14 dias
- definicao: percentual de clientes ganhos que completam ativacao tecnica em ate 14 dias.
- formula: `activation_14d = activated_within_14d / customer_won`
- fonte primaria: `gtm_customer_won` + `product_activation_completed`.

### TTFV (Time to First Value)
- definicao: tempo entre cliente ganho e primeiro valor operacional.
- formula: `median(hours(first_value_at - won_at))`
- fonte primaria: `gtm_customer_won` + `product_first_value_reached`.

### Payback
- definicao: meses necessarios para recuperar CAC com margem mensal da conta.
- formula: `payback_months = CAC / gross_margin_monthly`
- premissa v1: margem bruta padrao definida por RevOps/Financeiro enquanto margem por conta nao estiver disponivel.
- fonte primaria: CAC consolidado + receita/margem mensal.

### Novo MRR
- definicao: soma de MRR de clientes ganhos no periodo.
- formula: `new_mrr = sum(won_mrr)`
- fonte primaria: `gtm_customer_won` + financeiro (conciliacao de faturamento).

## Modelo minimo de dados (camada analitica)
- Tabela `fact_gtm_events`
  - colunas obrigatorias: `event_id`, `event_name`, `occurred_at_utc`, `entity_id`, `channel`, `campaign`, `payload_json`, `ingested_at_utc`
- Tabela `fact_marketing_cost_daily`
  - colunas obrigatorias: `cost_date`, `channel`, `campaign`, `amount_brl`, `source_system`, `loaded_at_utc`
- Tabela `fact_revenue_new_mrr`
  - colunas obrigatorias: `customer_id`, `won_date`, `new_mrr`, `currency`, `loaded_at_utc`

Requisitos:
- `event_id` unico para deduplicacao.
- timestamps em UTC.
- `channel` e `campaign` normalizados com dicionario unico.

## Rotina quinzenal de consistencia (CTO + CMO + RevOps)

### Janela
- D-2: congelar extracao do periodo quinzenal.
- D-1: reconciliacao tecnica e validacao de anomalias.
- D0: revisao quinzenal com CMO ([TICA-17](/TICA/issues/TICA-17)).

### Checks obrigatorios
- Integridade de eventos: taxa de null em chaves criticas < 1%.
- Duplicidade: `event_id` duplicado < 0.1%.
- Latencia de carga: 95p de ingestao < 6h.
- Coerencia de funil: volumes por etapa nao podem crescer >3x sem anotacao de campanha.
- Reconciliacao CRM vs tracking para SQL e Won: divergencia <= 5%.
- Reconciliacao novo MRR vs financeiro: divergencia <= 2%.

### Saida da rotina
- Snapshot quinzenal com 6 KPIs-base + variacao vs quinzena anterior.
- Lista de anomalias com dono, causa e prazo de correcao.
- Decisao de confiabilidade: `aprovado`, `aprovado_com_restricao`, `reprovado`.

## Riscos de qualidade de dados e mitigacao
- Risco: UTM/campaign inconsistente entre canais.
  - mitigacao: taxonomia unica de canal/campanha e bloqueio de valores invalidos no ETL.
- Risco: eventos sem `event_id` deterministico.
  - mitigacao: gerar UUID no emissor e rejeitar ingestao sem identificador.
- Risco: perda de eventos client-side por adblock/rede.
  - mitigacao: priorizar eventos server-side para marcos de negocio (MQL, SQL, Won).
- Risco: criterio de ativacao mudar sem versao.
  - mitigacao: campo `activation_version` obrigatorio nos eventos.
- Risco: atraso de integracao CRM/financeiro quebrar payback e novo MRR.
  - mitigacao: SLA de carga diario + fallback manual para fechamento quinzenal.

## Integracao operacional com GTM ([TICA-17](/TICA/issues/TICA-17))
- CTO entrega:
  - dicionario tecnico de eventos e metricas (este documento).
  - status de qualidade dos dados antes do ritual quinzenal.
- CMO entrega:
  - metas por KPI e decisoes de manter/pivotar/cortar por canal.
  - anotacoes de contexto de campanha para leituras fora do padrao.
- RevOps entrega:
  - dashboard quinzenal consolidado com cortes por canal/campanha/persona.

Acordo de interface:
- Definicoes tecnicas de calculo nao mudam sem versionamento e aviso previo de 1 ciclo.
- Mudancas de meta comercial nao alteram historico de calculo; apenas baseline/meta futura.

## Plano de implementacao (ate 2026-04-21)
1. Publicar contrato de eventos `gtm_*` no backend e validadores de payload.
2. Configurar carga diaria de custos por canal em `fact_marketing_cost_daily`.
3. Criar consulta quinzenal padrao com os 6 KPIs-base e reconciliacao.
4. Rodar dry-run da rotina de consistencia com amostra da semana atual.
5. Fechar aceite operacional com owner de [TICA-17](/TICA/issues/TICA-17).
