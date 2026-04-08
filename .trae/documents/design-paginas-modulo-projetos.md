# Design de Páginas — Módulo de Projetos (desktop-first)

## Padrões globais (aplicável a todas as páginas)
**Layout**: Grid híbrido (CSS Grid para estrutura + Flexbox para alinhamentos internos). Container central (max-width 1200–1440px) com gutters laterais.

**Meta (base)**
- title template: "Projetos — {Página}"
- description: "Gerencie projetos, acompanhe indicadores e exporte relatórios."
- Open Graph: og:title/og:description/og:type=website

**Design tokens (sugestão)**
- Background: #0B0F14 (ou #FFFFFF se tema claro); Surface: #111827 / #F8FAFC
- Texto primário: #E5E7EB / #0F172A; Texto secundário: #9CA3AF / #475569
- Accent: #3B82F6; Sucesso: #22C55E; Alerta: #F59E0B; Erro: #EF4444
- Tipografia: 14/16/20/24/32 (escala) com headings semânticos (h1–h3)
- Botões: primário (accent), secundário (outline), destrutivo (vermelho); hover + focus-ring consistente

**Acessibilidade (A11y)**
- Navegação por teclado: ordem lógica de tab; atalhos opcionais (ex.: / para foco em busca)
- Foco visível: outline/focus-ring com contraste (>= 3:1 com o fundo)
- Formulários: label visível, mensagens de erro associadas (aria-describedby)
- Tabelas: `<th scope="col">`, cabeçalho fixo opcional; linhas selecionáveis com estado anunciado
- Ícones com texto alternativo (aria-label) e botões com nomes acessíveis

**Estados e feedback**
- Loading: skeletons em KPIs/tabelas; progress em exportação
- Empty state: mensagem + CTA principal ("Criar projeto")
- Error state: banner com retry + detalhe colapsável
- Confirmação: toast + opção "desfazer" quando aplicável

**Responsivo**
- Desktop-first: grid 12 colunas; em <= 1024px colapsar filtros para drawer; em <= 768px tabela vira lista/cards.

---

## Página: Dashboard de Projetos (/projetos/dashboard)
**Layout**: Coluna única com seções empilhadas; KPIs em grid 4x1 (desktop), 2x2 (tablet).

**Meta**
- title: "Projetos — Dashboard"

**Estrutura da página**
1. **Topbar**
   - Breadcrumb: "Projetos / Dashboard"
   - Ações: botão primário "Novo projeto"; atalho "Ver todos".
2. **Faixa de KPIs (cards)**
   - Cards: Total, Ativos, Arquivados, Vencendo/Em risco (se aplicável)
   - Clique no card aplica filtro e navega para /projetos.
3. **Seção: Projetos recentes**
   - Lista curta (5–10 itens) com nome, status, atualizado em.
4. **Seção: Alertas/pendências (opcional se aplicável)**
   - Lista de projetos atrasados/vencendo; destaque visual (badge).

**Interações**
- Cards e itens da lista com hover + focus; navegação por Enter/Espaço.

---

## Página: Projetos — Lista (/projetos)
**Layout**: Duas colunas (desktop): painel de filtros (esquerda 280–320px) + conteúdo (direita). Em telas menores, filtros em drawer.

**Meta**
- title: "Projetos — Lista"

**Estrutura da página**
1. **Header**
   - h1: "Projetos"
   - Busca (input) com placeholder "Buscar por nome ou descrição"
   - Ações: "Novo projeto" + "Exportar" (atalho para Relatórios com filtros atuais)
2. **Painel de filtros**
   - Status (select/chips), Responsável (select), Intervalo de datas (date range)
   - Botões: "Aplicar", "Limpar", (opcional) "Salvar filtro"
3. **Tabela de projetos**
   - Colunas mínimas: Nome, Status, Responsável, Início, Fim, Atualizado em, Ações
   - Ordenação por colunas; paginação; seleção opcional para exportação em lote
4. **Ações por linha (menu)**
   - Ver detalhes, Editar, Arquivar/Reativar, Excluir (com confirmação)

**A11y específico**
- Tabela com navegação por teclado (setas opcional); menu de ações com aria-expanded e foco gerenciado.

---

## Página: Projeto — Detalhe (/projetos/:id)
**Layout**: Cabeçalho fixo + conteúdo em cards; seção lateral opcional para metadados.

**Meta**
- title: "Projetos — Detalhe"

**Estrutura da página**
1. **Header do projeto**
   - Nome (h1), badge de status, datas
   - Ações: "Editar", "Arquivar/Reativar", "Excluir"
2. **Card: Descrição e informações**
   - Campos principais; layout em duas colunas no desktop
3. **Card: Histórico básico**
   - Lista de eventos (criado, atualizado, arquivado) se disponível

**Interações**
- Excluir: modal destrutivo com texto claro e botão secundário (cancelar) focado por padrão.

---

## Página: Projeto — Criar/Editar (/projetos/novo, /projetos/:id/editar)
**Layout**: Formulário em cards com grid 2 colunas; ações fixas no rodapé.

**Meta**
- title: "Projetos — Criar" / "Projetos — Editar"

**Estrutura da página**
1. **Form**
   - Nome (obrigatório), Descrição (textarea), Status, Datas, Responsável
2. **Validação**
   - Erros inline + resumo no topo (âncoras para campos com erro)
3. **Barra de ações**
   - Primário: "Salvar"; secundário: "Cancelar"; indicador de "salvando..."

**A11y específico**
- Labels explícitos; aria-invalid; mensagens vinculadas por aria-describedby.

---

## Página: Relatórios e Exportação (/projetos/relatorios)
**Layout**: Left-right (configuração à esquerda, preview à direita) no desktop.

**Meta**
- title: "Projetos — Relatórios"

**Estrutura da página**
1. **Configuração**
   - Tipo (ex.: listagem, por status, por período)
   - Filtros (reutilizar do módulo) + período
   - Formato: CSV / XLSX / PDF (conforme suportado)
2. **Pré-visualização**
   - Tabela/summary com amostra e total estimado
   - Avisos para grande volume (ex.: recomendar filtros)
3. **Exportar**
   - Botão "Gerar e baixar"; progresso; exibir link quando pronto

**Estados**
- Exportação longa: mostrar spinner + desabilitar botão + permitir cancelar (se implementado).