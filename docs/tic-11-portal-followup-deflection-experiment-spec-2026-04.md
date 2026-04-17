# TIC-11: Especificacao de Experimento - Deflexao de Follow-up no Portal (TIC-8 N+2)

Data: 2026-04-17  
Owner: CMO  
Dependencia tecnica: TIC-8 N+2.4 (hooks de portal e telemetria)

## Resumo executivo de marketing
Oportunidade: reduzir contatos de follow-up evitaveis no suporte ao melhorar clareza de status e proximo passo no portal do cliente.  
Objetivo: aumentar deflexao sem piorar experiencia do cliente, diminuindo volume de contato reativo e custo operacional por ticket.  
Publico: empresas B2B com operacao de suporte recorrente, alto volume de tickets e necessidade de rastreabilidade (ICP TicketBR).

## Hipotese de crescimento
"Acreditamos que, para solicitantes de tickets com status em andamento no portal, exibir microcopy orientada por taxonomia + CTA de autoatendimento contextual reduz a taxa de abertura de contato de follow-up em pelo menos 15% em 14 dias, mantendo CSAT e tempo de resolucao estaveis."

## Persona/ICP alvo
- ICP prioritario: empresas de servicos, SaaS e operacoes internas com >10 agentes e >300 tickets/mes.
- Persona primaria: coordenador(a) de suporte/atendimento focado em produtividade e SLA.
- Persona secundaria: solicitante final que busca previsibilidade de andamento sem acionar o time.

## Mensagem principal
Dor: "Nao sei o que esta acontecendo com meu ticket e preciso cobrar o time."  
Promessa: "No portal, o cliente entende status, proximo passo e prazo esperado sem precisar abrir novo contato."  
Prova: status mapeado por taxonomia unificada, historico rastreavel no portal e eventos auditaveis (`portal_status_view`, `followup_avoided`, `contact_opened`).  
CTA: "Acompanhar atualizacao no portal" e "Ver o que fazer agora" (acao contextual por status).

## Estrategia de canais
- In-product (portal): canal principal para capturar intencao no momento da duvida; maior aderencia ao ICP e menor CAC incremental.
- Lifecycle (email/WhatsApp transacional): reforcar link de acompanhamento no portal apos atualizacoes de status criticas.
- Enablement de CS/Vendas: alinhar narrativa de "transparencia operacional" para demonstracao e objecoes de "falta de visibilidade".

## Plano de campanha
Oferta: experiencia "Status Claro + Proximo Passo" no portal para tickets em estados de espera/andamento.  
Formato: experimento A/B por variante de microcopy e CTA contextual.

Ativos:
- Variante A (controle): texto atual sem orientacao adicional.
- Variante B (tratamento): texto orientado a status + proximo passo + CTA de autoatendimento.
- Copys por chave de taxonomia (coautor UXDesigner + CMO).
- Painel de leitura de funil de deflexao (RevOps + CTO).

Cronograma:
- 2026-04-19 a 2026-04-24: baseline e QA de eventos de funil.
- 2026-04-27 a 2026-04-29: ativacao do A/B em 20% do trafego elegivel.
- 2026-04-30 a 2026-05-06: validacao estatistica e leitura de impacto.
- 2026-05-07+: escala para 100% se criterios de sucesso forem atingidos.

## Metricas de sucesso
KPI primario:
- Taxa de deflexao de follow-up por sessao de portal elegivel  
Formula: `followup_avoided / (followup_avoided + contact_opened)`  
Meta temporal: +15% vs baseline em ate 14 dias de experimento.

KPIs secundarios:
- Taxa de conversao por etapa do funil de deflexao (`portal_status_view` -> `followup_avoided` ou `contact_opened`).
- CPL por canal de nurture transacional (quando houver reforco por email/WhatsApp).
- CAC payback (efeito indireto: eficiencia operacional em contas adquiridas por marketing).
- MQLs/SQLs e win rate de oportunidades originadas por marketing com narrativa "portal com rastreabilidade".
- Retencao/expansao influenciada por campanhas de lifecycle apos adocao de portal.
- Share of voice de claims de "transparencia + governanca" em conteudo e vendas (tracking qualitativo + volume de mencoes).
- Trafego qualificado para paginas/fluxos de portal (sessao autenticada elegivel).

## Orcamento e alocacao
- Midia paga: R$ 0 (experimento primariamente in-product).
- Conteudo/lifecycle: R$ 1.500 (producao de templates + operacao de comunicacoes transacionais).
- Analytics/RevOps: R$ 2.000 (instrumentacao, dashboard e validacao de dados).
- Total estimado: R$ 3.500 no ciclo de teste + validacao.

## Riscos e mitigacao
- Risco: promessa de transparencia acima da capacidade real de status.
  Mitigacao: validar taxonomia/copy com CPO/CTO antes do go-live; bloquear chaves sem mapeamento confiavel.
- Risco: falso positivo por amostra insuficiente.
  Mitigacao: criterio minimo de 400 sessoes elegiveis por variante ou janela de 14 dias (o que ocorrer depois).
- Risco: queda de satisfacao por mensagem excessivamente "defensiva".
  Mitigacao: monitorar CSAT e reabertura; rollback imediato se CSAT cair >5%.
- Risco: inconsistencias entre canais (portal vs atendimento humano).
  Mitigacao: playbook unico de mensagens para CS/Vendas + revisão semanal de aderencia.

## Prioridade (M0-M3) e justificativa
Classificacao: M0 (critico para crescimento imediato).

Avaliacao obrigatoria da iniciativa:
- Potencial de pipeline/receita: medio-alto (melhora narrativa comercial + eficiencia de entrega).
- Aderencia ao ICP: alta (dor central de visibilidade e rastreabilidade).
- Velocidade de execucao: alta (aproveita hooks de TIC-8 N+2.4).
- Custo estimado: baixo.
- Complexidade operacional: media (dependencias entre UX, CTO e RevOps).
- Risco de marca: medio (se copy prometer mais do que status real).
- Dependencias com produto/comercial: alta (taxonomia, eventos, enablement de discurso).

Justificativa: o experimento e pre-condicao para validar impacto da entrega N+2.4 e orientar escala com dados antes de ampliar investimento de aquisicao baseado nessa proposta de valor.

## Plano de execucao por fases
Teste:
- Ativar A/B com 20% do trafego elegivel.
- Congelar nomenclatura de eventos e dicionario de status antes do inicio.
- Rodar checklist de qualidade de dados por 48h.

Validacao:
- Ler KPI primario + secundarios com corte por segmento ICP e tipo de status.
- Confirmar neutralidade em CSAT e ausencia de regressao em tempo de resolucao.
- Documentar aprendizados de copy por taxonomia (o que reduz contato vs o que gera atrito).

Escala:
- Expandir para 60% e depois 100% se meta primaria for atingida e guardrails preservados.
- Publicar playbook comercial e de lifecycle com mensagem vencedora.
- Encadear experimento M1 de onboarding de portal para novas contas.

## Desenho experimental (operacional)
- Tipo: A/B randomizado (controle vs tratamento), com feature flag no portal.
- Unidade de randomizacao: `ticket_id` (mantendo variante consistente por ticket para evitar contaminacao).
- Populacao elegivel: sessoes autenticadas no portal com ticket em estados "em andamento", "aguardando terceiro" e "resolucao em validacao".
- Exclusoes: tickets com SLA estourado critico, contas piloto internas e tickets sem taxonomia publicada.
- Janela minima: 14 dias corridos ou alcance de 400 sessoes elegiveis por variante (o que ocorrer por ultimo).
- Guardrails:
  - CSAT nao pode cair mais de 5% vs baseline.
  - Taxa de reabertura nao pode subir mais de 8% vs baseline.
  - Tempo medio de resolucao nao pode piorar mais de 5% vs baseline.
- Regra de decisao:
  - Escalar se KPI primario >= +15% e todos os guardrails em conformidade.
  - Iterar copy se ganho entre +5% e +14% com guardrails ok.
  - Reverter se ganho < +5% ou qualquer guardrail violado.

## Eventos e atributos minimos (RevOps + CTO)
- `portal_status_view`
  - atributos: `ticket_id`, `account_id`, `taxonomy_key`, `variant`, `channel_source`, `timestamp`.
- `followup_avoided`
  - atributos: `ticket_id`, `account_id`, `taxonomy_key`, `variant`, `hint_action_type`, `timestamp`.
- `contact_opened`
  - atributos: `ticket_id`, `account_id`, `taxonomy_key`, `variant`, `contact_channel`, `timestamp`.
- `copy_variant_seen`
  - atributos: `ticket_id`, `taxonomy_key`, `variant`, `copy_version`, `timestamp`.

## Checklist de pronto-para-lancar
- Taxonomia de status aprovada por UXDesigner e validada por CPO/CTO.
- Feature flag ativa com capacidade de rollback imediato.
- Eventos publicados em ambiente de teste com payload completo.
- Dashboard RevOps validando funil por variante e por segmento ICP.
- Alinhamento de mensagem concluido com Vendas e CS.
- Dono de decisao de escala definido (CMO + CTO) com data de review agendada.

## Handoff por area
Produto:
- Confirmar elegibilidade de estados para exibicao de "proximo passo".
- Garantir feature flag para rollout e rollback.

Vendas:
- Incorporar narrativa de "deflexao com governanca" em pitch e tratamento de objecoes.
- Coletar feedback de deals sobre valor percebido da clareza do portal.

Conteudo:
- Criar matriz de mensagens por status/taxonomia.
- Produzir templates de email/WhatsApp transacional alinhados ao portal.

Design:
- Definir componente visual de "proximo passo" com variacoes por estado.
- Garantir consistencia com linguagem das superficies ticketing/kanban/chat.

Performance:
- Medir impacto incremental por variante e apoiar criterio de escala.
- Auditar qualidade de trafego elegivel no portal.

RevOps:
- Publicar dashboard semanal com funil de deflexao e cortes por ICP/canal.
- Conectar leitura de deflexao com indicadores obrigatorios de MQL/SQL, win rate, CAC e retencao.
