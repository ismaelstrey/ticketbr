# Design de Páginas — Área do Cliente (Desktop-first)

## Tokens globais (Global Styles)
- Layout base: container central com largura máx. 1200px; grid 12 colunas; espaçamentos em escala 4/8/12/16/24/32.
- Tipografia: Base 16px; títulos (24/20/18); texto secundário 14px.
- Cores:
  - Fundo: #0B1220 (app) e #FFFFFF (cards)
  - Texto primário: #0F172A; texto inverso: #E2E8F0
  - Primária: #2563EB; hover: #1D4ED8
  - Sucesso: #16A34A; Aviso: #F59E0B; Erro: #DC2626
  - Bordas: #E2E8F0; divisores: #CBD5E1
- Componentes:
  - Botão primário: preenchido (primária), raio 10px, altura 40px.
  - Botão secundário: contorno, fundo transparente.
  - Inputs: altura 40px; foco com anel (primária 30%).
  - Tabelas: cabeçalho fixo; zebra leve; ações à direita.
- Estados:
  - Loading: skeleton em cards e tabela.
  - Empty state: texto + CTA “Criar ticket”.
  - Erro: banner no topo do conteúdo + retry.

## Navegação e estrutura global (App Shell)
- Layout: sidebar fixa (largura ~260px) + área de conteúdo à direita.
- Sidebar: logo, itens (Painel, Tickets, Administração), seletor de empresa (quando aplicável), botão Sair.
- Topbar (conteúdo): breadcrumbs, busca (quando em Tickets), avatar com menu.
- Responsivo (breakpoints):
  - Desktop (>=1024): sidebar fixa.
  - Tablet/mobile: sidebar vira drawer; tabela vira lista com cards.

---

## Página 1 — Login e Acesso
### Layout
- Grid simples com card central (max 420px), alinhado ao centro.

### Meta Information
- Title: “Entrar — Área do Cliente”
- Description: “Acesse sua conta para abrir e acompanhar tickets.”
- Open Graph: título/descrição acima.

### Estrutura
1. Header compacto: logomarca.
2. Card de login:
   - Campo Email
   - Campo Senha
   - CTA primário: “Entrar”
3. Pós-login (se múltiplas empresas): modal/step de “Selecionar empresa”.

### Interações
- Validação inline (email válido, senha obrigatória).
- Erro de autenticação exibido no topo do card.

---

## Página 2 — Painel do Cliente
### Layout
- Conteúdo em seções empilhadas.
- Primeira linha: 3 cards de métricas.
- Segunda linha: tabela (ou lista) de tickets recentes.

### Meta Information
- Title: “Painel — Área do Cliente”
- Description: “Resumo e tickets recentes da sua empresa.”
- Open Graph: título/descrição acima.

### Estrutura
1. Topbar: breadcrumbs “Painel”.
2. Seção “Resumo” (cards):
   - Abertos
   - Atualizados recentemente
   - Fechados
3. Seção “Tickets”:
   - Toolbar: busca por texto + filtro de status + CTA “Novo ticket”.
   - Tabela: Assunto, Status, Atualizado em, Criado por, Ação “Abrir”.
4. Modal “Novo ticket”:
   - Assunto (input)
   - Descrição (textarea)
   - Anexo opcional (upload)
   - CTA: “Criar ticket”

### Interações
- Clique em linha abre “Detalhe do Ticket”.
- Filtros atualizam lista sem recarregar a página.

---

## Página 3 — Detalhe do Ticket
### Layout
- Layout 2 colunas:
  - Coluna principal (70%): conversa/comentários.
  - Coluna lateral (30%): atributos + histórico.

### Meta Information
- Title: “Ticket #{id} — Área do Cliente”
- Description: “Acompanhe atualizações e comentários do ticket.”
- Open Graph: título/descrição acima.

### Estrutura
1. Header do ticket:
   - Assunto (H1)
   - Badges: Status
   - Metadados: criado por, criado em, atualizado em
2. Coluna principal — Comentários:
   - Lista em timeline (bolhas/cards): autor, data/hora, corpo
   - Composer fixo no rodapé da coluna: textarea + botão “Enviar comentário”
3. Coluna lateral — Histórico:
   - Timeline de eventos (criação, mudanças, comentários)

### Interações
- Enviar comentário adiciona item imediatamente (optimistic UI) e trata falhas.

---

## Página 4 — Administração da Empresa
### Layout
- Página com tabs internas: “Membros”, “Papéis e Permissões”, “Auditoria”, “Notificações”.

### Meta Information
- Title: “Administração — Área do Cliente”
- Description: “Gerencie membros, RBAC, auditoria e notificações da empresa.”
- Open Graph: título/descrição acima.

### Estrutura
1. Tab “Membros”
   - CTA “Convidar membro” (modal com email e papel inicial)
   - Tabela: Nome/Email, Status, Papéis, Ações (desativar/remover)
2. Tab “Papéis e Permissões (RBAC)”
   - Lista de papéis (coluna esquerda)
   - Editor do papel (coluna direita): nome do papel + checklist de permissões
   - CTA salvar
3. Tab “Auditoria”
   - Filtros: período, usuário, tipo de ação
   - Tabela: data/hora, ator, ação, entidade, detalhe (drawer com before/after)
4. Tab “Notificações por email”
   - Seções por evento: “Ticket criado”, “Ticket atualizado”, “Novo comentário”
   - Toggle habilitar/desabilitar
   - Campo de destinatários (chips: emails / grupos internos)

### Interações
- Tabs preservam estado (filtros, paginação) ao alternar.
- Ações sensíveis (remover membro, alterar papel) pedem confirmação.
