# Design de Páginas — Módulo /tasks (desktop-first)

## Tokens e estilos globais
- Layout: híbrido **CSS Grid + Flexbox**.
- Breakpoints: desktop base (≥1200px); tablet (768–1199px) colunas comprimem; mobile (≤767px) Kanban vira lista/colunas em carrossel.
- Cores: fundo `#0B1220` (dark) ou `#F7F8FA` (light); texto principal `#111827` / `#E5E7EB`; acento `#2563EB`.
- Tipografia: 14px base; títulos 18/24px; mono apenas para IDs.
- Componentes: botões (primary/secondary/danger), inputs com foco visível, badges de status, chips de filtro, cards.
- Estados: hover com elevação leve; drag state com sombra + opacidade; disabled com 60% opacidade.

---

## Página: Tarefas (/tasks)
### Meta
- Title: “Tarefas”
- Description: “Gerencie tarefas em Kanban ou Lista com filtros e vencimentos.”
- Open Graph: título/descrição iguais; url /tasks.

### Estrutura (desktop-first)
- Grid 12 colunas.
- Top bar fixa (linha 1): título + ações + busca.
- Conteúdo (linha 2): **Sidebar de filtros** (3 colunas) + **Área principal** (9 colunas).

### Seções e componentes
1. **Top bar**
   - Título “Tarefas”.
   - Botões: “Nova tarefa”, toggle “Kanban | Lista”.
   - Campo de busca (título/descrição).
   - Ícone sino com badge (notificações de vencimento).

2. **Sidebar de filtros**
   - Status (multi-select).
   - Responsável (select).
   - Ticket (input + picker).
   - Vencimento (de/até) + toggle “Somente vencidas”.
   - Botões: “Aplicar”, “Limpar”.

3. **Área principal — Kanban**
   - Colunas (Backlog / A Fazer / Fazendo / Bloqueado / Concluído).
   - Cada coluna: header com contador; lista droppable.
   - **Cartão de tarefa**: título, badge status, responsável (avatar), vencimento (cor: ok/alerta/vencida), chips de ticket(s).
   - Drag-and-drop:
     - Ao arrastar: placeholder e highlight da coluna destino.
     - Ao soltar: atualiza status + sort_order; fallback visual de “salvando…”.

4. **Área principal — Lista**
   - Tabela com seleção em checkbox.
   - Colunas: Título, Status, Responsável, Vencimento, Ticket, Ações.
   - Ações em lote (barra contextual): mudar status, reatribuir, alterar vencimento, excluir.

5. **Drawer/Modal — Criar/Editar rápido**
   - Campos essenciais: título, descrição curta, status, responsável, vencimento, ticket.
   - Ações: “Salvar”, “Salvar e abrir detalhe”, “Excluir” (apenas em edição).

6. **Painel de notificações (popover/drawer)**
   - Abas: “Vencendo” e “Vencidas”.
   - Item: título + vencimento + CTA “Abrir”.
   - Ação: “Marcar como lida”.

---

## Página: Detalhe da Tarefa (/tasks/:id)
### Meta
- Title: “Detalhe da tarefa”
- Description: “Subtarefas, anexos e vínculos com tickets.”
- Open Graph: inclui ID da tarefa.

### Estrutura
- Cabeçalho com breadcrumb: “Tarefas > [Título]”.
- Layout 2 colunas (8/4): **conteúdo principal** + **painel lateral**.

### Seções e componentes
1. **Header**
   - Título editável inline.
   - Botões: “Concluir/Reabrir”, “Excluir”.

2. **Conteúdo principal**
   - Editor de descrição (textarea rica opcional simples).
   - **Subtarefas** (lista com checkbox): adicionar, editar inline, reordenar, remover.
   - **Anexos**:
     - Dropzone + botão “Adicionar arquivo”.
     - Lista com download, nome, tamanho, data, remover.

3. **Painel lateral**
   - Status (select), Responsável (select), Vencimento (date/time), Prioridade (se aplicável), Ordem (somente leitura).
   - **Tickets vinculados**: lista + botão “Vincular ticket” (picker); ação remover vínculo.
   - **Histórico básico**: timeline compacta (mudança de status/vencimento/anexo).

---

## Página: Preferências de Notificações (/tasks/settings/notifications)
### Meta
- Title: “Notificações de tarefas”
- Description: “Configure alertas por vencimento.”

### Estrutura
- Card central (máx 720px) com seções empilhadas.

### Seções e componentes
1. **Habilitar notificações in-app** (toggle)
2. **Antecedência de alerta** (select numérico em horas)
3. **Lembrete de vencidas** (toggle diário)
4. **Quiet hours (simples)**
   - Campos: início e fim (0–23) + texto de ajuda.
5. **Salvar**
   - Botão primário; toast de sucesso/erro.
