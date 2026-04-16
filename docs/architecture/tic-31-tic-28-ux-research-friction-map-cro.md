# TIC-31 / TIC-28 - UX Research e Friction Map para CRO (TicketBR)

## Objetivo
Mapear fricções de UX nos fluxos críticos e propor backlog de otimização para aumentar conversão operacional (CRO) e reduzir abandono/retrabalho.

## Escopo analisado
- Fluxo autenticado principal (sidebar, dashboard operacional, tarefas).
- Fluxo de autenticação (`/login` e `/cliente/login`).
- Fluxo cliente (`/cliente`, `/cliente/tickets/[id]`).
- Estados de feedback (loading, erro, vazio, toast, modal).
- Acessibilidade e consistência de tema/tokens.

## Método
- Heurística UX + arquitetura de componentes no código.
- Mapeamento de pontos de atrito por etapa de funil.
- Priorização por impacto no objetivo (CRO) x esforço técnico.

## Hipóteses de Persona
- Operador interno: precisa triar rápido, abrir tarefa/ticket sem ruído e manter contexto.
- Gestor: precisa ler dashboard rapidamente para decisão.
- Cliente externo: quer abrir ticket e acompanhar status sem ambiguidade.

## Funil alvo (interno)
1. Login
2. Entendimento inicial da situação (dashboard)
3. Navegação para módulo certo (sidebar)
4. Ação primária (criar/editar/mover item)
5. Confirmação de resultado e continuidade

## Friction Map

| Etapa | Fricção observada | Impacto CRO | Evidência | Severidade | Oportunidade |
|---|---|---|---|---|---|
| Login | Pouco contexto de valor na tela de entrada | Reduz confiança inicial e clareza de próximo passo | Telas de login minimalistas e funcionais | Média | Melhor onboarding visual e microcopy de valor |
| Dashboard | Ações de atualização/exportação competem com leitura de KPI | Sobrecarga cognitiva inicial | Header com muitos botões de mesmo peso | Média | Hierarquia de ações (primária/secundária) |
| Navegação | Em mobile, menu lateral era de baixa descobribilidade | Bloqueio de navegação e abandono | Sidebar colapsada sem trigger explícito (corrigido) | Alta | Trigger persistente + feedback visual |
| Tarefas/Kanban | Feedback de operação assíncrona pouco padronizado | Incerteza pós-ação e repetição de clique | Mensagens e hints heterogêneos | Alta | Estados de feedback unificados |
| Tabelas e formulários | Estilos e estados de foco/erro variavam | Erros de preenchimento e maior tempo por tarefa | Uso misto de estilos inline e padrões | Média | Base components com tokens e estados semânticos |
| Toast/alerta | Notificação sem ação explícita de dismiss | Perda de controle da interface | Toast auto-dismiss sem controle fino (melhorado) | Baixa/Média | Dismiss, role correto e motion reduzido |
| Fluxo cliente | Lista/detalhe usa blocos com estilos pontuais | Inconsistência perceptiva entre módulos | Uso de styles inline em partes do fluxo | Média | Aplicar feedback states e componentes base |

## Backlog priorizado (CRO)

### P0 - impacto alto / esforço baixo-médio
1. Garantir navegação mobile previsível em todos os módulos autenticados.
2. Padronizar estados de feedback (loading/erro/vazio/sucesso) no dashboard, tarefas e listas principais.
3. Consolidar tokens semânticos para ações globais e contraste em dark mode.

### P1 - impacto alto / esforço médio
1. Rebalancear hierarquia de ações no header do dashboard (foco em ação primária do momento).
2. Aplicar padrão único para formulários com erro semântico (`aria-invalid`, hints consistentes).
3. Definir padrão de ação destrutiva com confirmação contextual e linguagem clara.

### P2 - impacto médio / esforço médio
1. Melhorar microcopy de login e empty states por contexto de negócio.
2. Revisar fluxo cliente para reduzir estilos pontuais e reforçar previsibilidade visual.
3. Instrumentar testes A/B de microinterações (tempo de conclusão x erro).

## Instrumentação recomendada (analytics)

### Eventos principais
- `login_submitted`, `login_success`, `login_error`
- `nav_item_clicked` (com origem: sidebar mobile/desktop)
- `dashboard_filter_applied`, `dashboard_export_clicked`
- `task_created`, `task_moved`, `task_move_failed`
- `feedback_state_rendered` (loading/error/empty por página)

### Métricas de sucesso
- Taxa de sucesso no login.
- Tempo até primeira ação útil após login (TTV operacional).
- Taxa de conclusão de criação/movimentação de tarefa.
- Redução de erros por formulário.
- Redução de abandono em mobile.

## Critérios de aceite para TIC-31/TIC-28
1. Fricções críticas mapeadas por etapa de funil, com severidade e hipótese de impacto.
2. Backlog priorizado com ações objetivas de UX/CRO.
3. Plano mínimo de instrumentação para validar hipóteses.
4. Alinhamento com design system (tokens, estados e acessibilidade) sem acoplamento de regra de negócio na UI.

## Progresso desta execução
- Sidebar mobile com trigger explícito de abertura/fechamento.
- Feedback states padronizados em áreas críticas.
- Evolução de componentes base para consistência de tema/acessibilidade.
- Ajustes em toasts para clareza, controle e acessibilidade.

## Próxima etapa recomendada
Rodar ciclo de validação em produção controlada (7-14 dias) com eventos acima e revisar priorização P0/P1 com dados reais de uso.
