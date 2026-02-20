# Análise de maturidade do TicketBR

## Visão geral
O projeto já possui uma base sólida: Next.js com API routes, Prisma, autenticação por cookie JWT, módulos de cadastro (solicitantes, operadores, usuários), Kanban de tickets e schema de banco com entidades relevantes.

## O que já existe (pontos fortes)
- Estrutura fullstack no mesmo repositório (app + APIs).
- Camada de persistência com Prisma e migrations.
- Modelo de domínio relativamente completo para service desk (Ticket, Solicitante, Operador, Mesa, Tipo, Categoria, Eventos).
- Validação com Zod em endpoints críticos.
- Controle de sessão com JWT em cookie HTTP-only.
- Tela principal com Kanban e fluxo de edição.

## Principais lacunas para virar “sistema completo”

## 1) Governança técnica e qualidade
- **Lint quebrado**: o script `npm run lint` falha e hoje não protege qualidade em PR.
- **Cobertura de testes insuficiente**: há apenas teste unitário de CPF/CNPJ; faltam testes para APIs, autenticação, permissões e fluxos de negócio.
- **Falta de pipeline CI/CD formal**: não há workflow de validação automática (lint/test/build) em pull request.

### Ações recomendadas
1. Corrigir o script de lint e padronizar regras (ESLint/TypeScript).
2. Adicionar testes de API (auth, tickets, solicitantes) e smoke tests de UI.
3. Criar pipeline CI (GitHub Actions) com gates obrigatórios.

## 2) Segurança e controle de acesso
- Existe autenticação, porém **controle de autorização por perfil (RBAC)** ainda está fraco/incompleto no domínio.
- Falta política clara de proteção para operações administrativas por role (ex.: ADMIN vs AGENT).
- Falta trilha de segurança (rate-limit em login, bloqueio progressivo, rotação/expiração de sessão mais robusta, revisão de headers de segurança).

### Ações recomendadas
1. Implementar RBAC por rota e por ação (ler/criar/editar/excluir).
2. Criar middleware de autorização por permissões.
3. Adicionar rate-limit e logs de tentativas de login.

## 3) Consistência funcional (domínio)
- O Kanban ainda usa **dados mockados locais** como fonte principal da tela, reduzindo aderência ao banco em tempo real.
- Coexistem campos “legacy” e novos relacionamentos no ticket, indicando migração parcial de modelo.
- Falta fechar ciclos completos de negócio (ex.: regras de SLA, transições de status com validações rígidas, anexos, notificações, histórico auditável por usuário).

### Ações recomendadas
1. Trocar definitivamente o frontend para consumir APIs reais (`/api/tickets`) como source of truth.
2. Planejar migração para remover campos legados gradualmente.
3. Formalizar regras de transição de status e SLA em camada de serviço.

## 4) Operação e observabilidade
- Endpoint de health existe, mas sem checks dependentes (DB, latência, versão, uptime).
- Falta stack de observabilidade (logs estruturados, métricas, tracing, alertas).
- Build depende de conexão com banco no postbuild (`db:migrate`), o que pode quebrar deploy em ambientes sem acesso.

### Ações recomendadas
1. Enriquecer `/api/health` com status de dependências.
2. Adotar logs estruturados e dashboards básicos.
3. Revisar estratégia de migration em deploy para não falhar build sem necessidade.

## 5) Produto e experiência
- Falta camada de recursos típicos de sistema completo de tickets:
  - anexos;
  - comentários privados/públicos;
  - notificações (email/websocket);
  - filtros avançados e relatórios;
  - SLA por tipo/categoria com alertas;
  - painel gerencial com KPIs persistidos.

### Ações recomendadas
1. Definir backlog de funcionalidades por prioridade de negócio.
2. Criar versão “MVP robusto” e versão “enterprise” com roadmap de 90 dias.

## 6) Documentação e prontidão de equipe
- API.md e README existem, mas falta documentação operacional completa:
  - arquitetura;
  - padrão de branches/release;
  - ambiente por stage;
  - runbook de incidentes;
  - política de backup/restore.

### Ações recomendadas
1. Criar documentação de arquitetura e operação.
2. Definir critérios de pronto por feature (DoD).

---

## Plano de evolução sugerido (30/60/90 dias)

### 0–30 dias (estabilização)
- Corrigir lint, CI, testes mínimos de API.
- Ajustar estratégia de build/deploy sem hard dependency de DB no postbuild.
- Fechar autenticação/autorização básica por perfis.

### 31–60 dias (consolidação)
- Remover mocks do Kanban e unificar com backend.
- Completar regras de fluxo do ticket (SLA/status/eventos).
- Implantar logs estruturados e health checks de dependências.

### 61–90 dias (escala)
- Notificações, relatórios e dashboards.
- Hardening de segurança e auditoria.
- Rotinas de backup/restore e governança operacional.

## Definição prática de “sistema completo” para o TicketBR
Considere o sistema “completo” quando atender simultaneamente:
- Qualidade: CI com lint/test/build obrigatórios.
- Segurança: autenticação + autorização por perfil/permissão + trilha de auditoria.
- Operação: health de dependências, observabilidade e runbook.
- Produto: fluxo fim-a-fim de ticket sem dependência de mocks.
- Governança: documentação de arquitetura, deploy e suporte.
