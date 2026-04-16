# TIC-31 / TIC-28 - Plano Operacional por PR (CRO)

## Objetivo
Converter o friction map em entregas incrementais, testáveis e com impacto mensurável em conversão operacional.

## Estratégia
- Entregar em ondas curtas (PRs pequenas).
- Cada PR com hipótese, métrica e rollback claro.
- Evitar mistura de regra de negócio com componentes visuais.

## PR-1 - Navegação e descobribilidade mobile

### Escopo
- Padronizar trigger de menu lateral em mobile nos módulos autenticados.
- Garantir fechamento previsível (overlay, botão, escape quando aplicável).
- Ajustar foco visível e ordem de tab.

### Hipótese CRO
Usuários mobile iniciam ação útil mais rápido após login.

### Métricas
- Tempo até primeiro clique de navegação.
- Taxa de abandono por sessão mobile.

### Critério de pronto
- Navegação acessível em mobile sem bloqueio de fluxo.
- Testes de UI de sidebar passando.

## PR-2 - Feedback states unificados (loading/erro/vazio/sucesso)

### Escopo
- Aplicar `FeedbackState` nos fluxos críticos: dashboard, tarefas, listas principais.
- Remover estilos inline de estados de feedback.
- Padronizar mensagens e calls-to-action.

### Hipótese CRO
Menor retrabalho e menor repetição de ações por incerteza de status.

### Métricas
- Taxa de repetição de clique em ações assíncronas.
- Tempo médio para concluir ação (criar/mover/filtrar).

### Critério de pronto
- Estados consistentes entre páginas críticas.
- Sem regressão visual em light/dark.

## PR-3 - Formulários e ações críticas

### Escopo
- Uniformizar estados inválidos (`aria-invalid`, hints, foco).
- Padronizar botões destrutivos e confirmações de ação.
- Revisar microcopy de erro em login e criação de itens.

### Hipótese CRO
Redução de erro de preenchimento e aumento de conclusão de formulários.

### Métricas
- Taxa de erro por formulário.
- Conversão em criação de ticket/tarefa/projeto.

### Critério de pronto
- Comportamento semântico de formulário consistente.
- Contraste e foco acessíveis.

## PR-4 - Instrumentação e validação

### Escopo
- Instrumentar eventos-chave definidos no friction map.
- Criar painel mínimo de acompanhamento (7/14 dias).
- Definir baseline e comparação pós-implantação.

### Hipótese CRO
Decisões de UX passam a ser guiadas por dados de comportamento real.

### Métricas
- `login_success` / `login_error`
- `nav_item_clicked`
- `dashboard_filter_applied` / `dashboard_export_clicked`
- `task_created` / `task_moved` / `task_move_failed`

### Critério de pronto
- Eventos emitidos com schema consistente.
- Relatório inicial de impacto pós-deploy.

## Ordem recomendada
1. PR-1
2. PR-2
3. PR-3
4. PR-4

## Riscos e mitigação
- Risco: regressão visual cross-page.
  Mitigação: checklist de tokens + snapshots visuais em telas críticas.
- Risco: inconsistência de texto/microcopy.
  Mitigação: catálogo único de mensagens de estado.
- Risco: ruído de telemetry.
  Mitigação: schema versionado para eventos.

## Definition of Done (global)
1. Entrega aderente ao design system (tokens sem hardcode relevante).
2. Acessibilidade mínima validada (foco, contraste, semântica).
3. Métrica primária definida e monitorada para cada PR.
4. Sem regressão funcional (lint + testes direcionados verdes).
