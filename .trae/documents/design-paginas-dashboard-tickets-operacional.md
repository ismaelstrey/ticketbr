# Design de Páginas — Dashboard Operacional de Tickets (Desktop-first)

## Global Styles (Design Tokens)
- Background: #0B1220 (app shell) e #0F172A (cards)
- Surface/card border: #1F2937; Divider: #243244
- Texto primário: #E5E7EB; texto secundário: #9CA3AF
- Accent (ações/links): #3B82F6; sucesso: #22C55E; alerta: #F59E0B; crítico: #EF4444
- Tipografia: Inter (fallback system-ui)
  - H1 24/32, H2 18/28, Body 14/22, Caption 12/18
- Botões: 36px height, radius 10px
  - Primary: fundo #3B82F6, hover #2563EB
  - Secondary: fundo transparente, borda #334155, hover #111827
- Inputs: 36px height, radius 10px, foco com outline #3B82F6 2px
- Tabela: linhas 44px, hover com #111827, zebra opcional discreta

## Layout & Responsividade
- Abordagem: CSS Grid para o shell + Flexbox em componentes.
- Breakpoints:
  - Desktop (>=1280): layout completo com grid 12 colunas.
  - Tablet (768–1279): KPIs quebram em 2 colunas; gráficos empilham.
  - Mobile: fora do foco, mas deve degradar para coluna única (sem perder função).

---

## 1) Página: Login

### Meta Information
- Title: "Login | Dashboard de Tickets"
- Description: "Acesse o dashboard operacional de tickets."
- Open Graph: título e descrição equivalentes.

### Page Structure
- Centro da tela (max-width 420px) com card.

### Sections & Components
1. Topo do card
   - Logo/nome do produto + subtítulo "Acesso operacional".
2. Formulário
   - Campo Email
   - Campo Senha (toggle mostrar/ocultar)
   - Botão "Entrar"
   - Link "Esqueci minha senha" (se habilitado)
3. Estados
   - Loading no botão
   - Mensagens de erro (credenciais inválidas / usuário sem permissão)

---

## 2) Página: Dashboard Operacional

### Meta Information
- Title: "Dashboard Operacional | Tickets"
- Description: "Métricas, gráficos e lista de tickets com filtros e auto-refresh."
- Open Graph: título/descrição + URL canônica.

### Page Structure
- App Shell com Header fixo + área de conteúdo com scroll.
- Grid principal (12 colunas):
  - Linha 1: barra de filtros (12 col)
  - Linha 2: cards KPI (12 col)
  - Linha 3: gráficos (8 col) + distribuição (4 col)
  - Linha 4: tabela de tickets (12 col)

### Sections & Components
1. Header (fixo)
   - Nome do produto (esquerda)
   - Indicador: "Última atualização: HH:MM:SS"
   - Controle Auto-refresh: toggle + select de intervalo (15s/30s/60s)
   - Botão "Atualizar agora"
   - Menu do usuário (avatar) + logout

2. Barra de Filtros (card)
   - Período: preset (Hoje / 7 dias / 30 dias) + range (date-time)
   - Status (multi-select)
   - Fila (multi-select)
   - Prioridade (multi-select)
   - Responsável (search select)
   - Busca rápida (texto: assunto/chave externa)
   - Ações: "Aplicar", "Limpar"
   - (Supervisor) "Salvar visão" / "Visões" (dropdown)
   - Regras: qualquer mudança de filtro mostra badge "não aplicado" até aplicar (evita reconsultas excessivas).

3. KPIs (cards)
   - Cards: Abertos, Novos no período, Resolvidos no período, SLA em risco, SLA estourado, Backlog na fila
   - Cada card: número grande + variação (seta) opcional + mini legenda do filtro aplicado.
   - Clique no KPI aplica filtro rápido (ex.: clicar "SLA estourado" adiciona condição e rola para tabela).

4. Gráficos
   - Gráfico de série temporal: "Entradas vs Saídas" (linha/área) com tooltip.
   - Gráfico de barras: "Backlog por fila".
   - Gráfico donut: "Distribuição por status".
   - Estados: skeleton durante loading; empty state "Sem dados para os filtros".

5. Tabela de Tickets (card)
   - Cabeçalho: título "Tickets" + contador (ex.: 1.234) + ações à direita:
     - Exportar CSV
     - Exportar XLSX
     - Seletor de colunas (mostrar/ocultar)
   - Colunas sugeridas: Chave, Assunto, Status, Fila, Prioridade, Responsável, Idade, SLA (badge), Atualizado em.
   - Interações:
     - Ordenação por Atualizado em / SLA / Prioridade
     - Paginação (server-side) e tamanho de página (25/50/100)
     - Linha clicável abre Detalhe do Ticket (nova aba opcional)
     - Badges: crítico (vermelho), alerta (âmbar), ok (verde)

6. Estados & Performance percebida
   - Carregar KPIs/gráficos/tabela em paralelo; evitar bloquear a tela inteira.
   - Manter dados anteriores durante refresh (stale-while-revalidate).
   - Virtualizar linhas quando página >= 50.

---

## 3) Página: Detalhe do Ticket

### Meta Information
- Title: "Ticket {chave} | Detalhe"
- Description: "Detalhes e histórico do ticket."

### Page Structure
- Layout em 2 colunas (8/4):
  - Esquerda: conteúdo e timeline
  - Direita: painel de atributos (sticky)

### Sections & Components
1. Top bar (breadcrumb)
   - "Dashboard > Tickets > {chave}" + botão "Voltar" (preserva filtros e posição quando possível).

2. Resumo do Ticket (header do conteúdo)
   - Título (assunto) + chips (status, prioridade)
   - Bloco compacto de SLAs: first response / resolução (com cores)

3. Timeline / Histórico
   - Lista cronológica (cards/itens) com:
     - Tipo do evento (status change, atribuição, comentário/ação)
     - Autor (quando existir)
     - Data/hora
     - Detalhes (payload renderizado de forma legível)

4. Painel de Atributos (direita, sticky)
   - Campos: Fila, Responsável, Tags, Canal, Criado em, Atualizado em, Resolvido em.
   - Ações rápidas (somente navegação): "Copiar chave", "Copiar link".
