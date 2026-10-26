# Plano — Módulo de Contratos com Termos de SLA

Data: 2026-10-26
Status: F1 (núcleo do contrato), F2 (SLA, vínculo e bloqueio) e F3 (operação — expiração, renovação automática, avisos de vencimento 30/15/7, notificações `CONTRACT_*`, relatório de conformidade/valor por contrato e janela de horário comercial + feriados) implementadas; cron `contract-scan` agendado em `vercel.json`. Gates verdes (`tsc`, `eslint`, `vitest run` 564 testes).

## 1. Objetivo e escopo

Criar o módulo de **Contratos** onde cada empresa (`Solicitante`) possui contrato, com termos de SLA, validade, valor e cancelamento. Requisitos levantados:

1. **Página de contratos** para criar, editar e consultar contratos.
2. **Vínculo do contrato ao solicitante** (feito a partir do cadastro do solicitante, e também na criação do contrato).
3. **Validade e renovação** — contratos vencem e precisam ser renovados (ou substituídos por um novo).
4. **Valor** — todo contrato tem valor mensal.
5. **Cancelamento com interrupção do serviço** — ao cancelar, o atendimento do solicitante é interrompido até a renovação do contrato ou a criação de um novo.
6. **SLA global com SLA diferenciado por empresa** — tipo de ticket com prioridade máxima, contrato secundário.

Hoje o SLA por empresa é um mapa hardcoded em código ([ticket-status-policy.ts](file:///g:/DEV/ticketbr/src/server/services/ticket-status-policy.ts#L10-L17)) e não existe modelo de contrato nem mecanismo de bloqueio:

```ts
export const DEFAULT_SLA_HOURS = 8;
export const COMPANY_SLA_HOURS: Record<string, number> = {
  "ACEM PRIME SERVIÇOS DE INTERNET LTDA": 6,
  NETMITT: 4,
  "LP INTERNET": 8
};
```

## 2. Modelo conceitual

```
SlaPolicy (global / padrão do sistema)
      ▲ herdada por
Contrato (N por Solicitante, com vigência)  ──► ContratoSlaTermo[] (overrides)
      │ 1 vigente por empresa
      ▼
Solicitante ──► servico_bloqueado (derivado do contrato) ──► portal / tickets / chat
      ▲
Ticket ──► grava snapshot do SLA resolvido (fonte + horas) na criação
```

### 2.1 Hierarquia de resolução do SLA

**Decisão do usuário (2026-10-26): o tipo de ticket tem prioridade máxima; o SLA do contrato é secundário.**

O tipo de ticket é a fonte primária do prazo. O contrato (e seus termos) só é consultado quando o tipo de ticket **não** define SLA. Preserva o comportamento atual e adiciona o SLA diferenciado por empresa como camada secundária.

1. `ticket.solutionSlaAt` — prazo explícito gravado manualmente.
2. `tipo_ticket.sla_horas` — **prioridade máxima** quando definido e maior que zero.
3. Termo de SLA do contrato que casa com o escopo do ticket (categoria → prioridade → global do contrato).
4. `contrato.slaSolucaoHoras` / `contrato.slaRespostaHoras` — SLA diferenciado da empresa.
5. `SlaPolicy.isDefault` — SLA global do sistema.
6. `DEFAULT_SLA_HOURS` — constante de último recurso.

> **Implicação**: para o contrato diferenciar a empresa, o tipo de ticket precisa poder ficar **sem SLA**. Com `Tipo_Ticket.sla_horas` obrigatório (`Int`), todo ticket cai na regra 2 e o contrato nunca aplica. Tornar o campo opcional (`Int?`) passa a ser escopo de F1.

### 2.2 Ciclo de vida do contrato

```
DRAFT ──ativar──► ACTIVE ──vencer──► EXPIRED ──renovar──► ACTIVE (novo contrato)
                    │  │                                        ▲
                    │  └──cancelar──► CANCELLED ───────────────┘
                    └──suspender──► SUSPENDED ──reativar──► ACTIVE
```

| Status | Vigente | Bloqueia serviço | Observação |
| --- | --- | --- | --- |
| `DRAFT` | não | não | Rascunho; pode existir sem empresa vinculada |
| `ACTIVE` | sim | não | Único por empresa (garantido por constraint) |
| `SUSPENDED` | não | **sim** | Pausa temporária; reativável |
| `EXPIRED` | não | **sim** | Vencido (`fimVigencia` no passado); base para renovação |
| `CANCELLED` | não | **sim** | Cancelamento definitivo; histórico preservado |

## 3. Modelagem de dados (Prisma)

### 3.1 Enums

```prisma
enum ContractStatus {
  DRAFT
  ACTIVE
  SUSPENDED
  EXPIRED
  CANCELLED
}

enum SlaTermScope {
  TIPO_TICKET
  CATEGORIA
  PRIORIDADE
  GLOBAL
}

enum SlaSource {
  MANUAL
  CONTRACT_TERM
  CONTRACT
  GLOBAL_POLICY
  TICKET_TYPE
  FALLBACK
}

// Motivo do bloqueio do serviço do solicitante
enum ServiceBlockReason {
  CONTRATO_CANCELADO
  CONTRATO_VENCIDO
  CONTRATO_SUSPENSO
  MANUAL
}
```

### 3.2 Política global de SLA

```prisma
model SlaPolicy {
  id                 String   @id @default(cuid())
  nome               String   @db.VarChar(120)
  descricao          String?  @db.Text
  isDefault          Boolean  @default(false) @map("is_default")
  slaRespostaHoras   Int?     @map("sla_resposta_horas")
  slaSolucaoHoras    Int      @map("sla_solucao_horas")
  alertaAtencaoPct   Int      @default(70) @map("alerta_atencao_pct")
  alertaCriticoPct   Int      @default(85) @map("alerta_critico_pct")
  ativo              Boolean  @default(true)

  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt
  created_by         String?
  updated_by         String?

  contratos          Contrato[]

  @@index([isDefault, ativo])
}
```

Os limiares hoje hardcoded em [sla.ts](file:///g:/DEV/ticketbr/src/lib/sla.ts#L1-L6) e [sla-chip.ts](file:///g:/DEV/ticketbr/src/lib/tickets/sla-chip.ts#L4-L9) (70/85/100 e 70/90/100) passam a ser lidos da política, com os valores atuais como fallback.

### 3.3 Contrato

```prisma
model Contrato {
  id                 String         @id @default(cuid())
  numero             String         @unique @db.VarChar(60)
  titulo             String         @db.VarChar(200)
  descricao          String?        @db.Text

  // Nulo enquanto DRAFT: permite criar o contrato na página de contratos e vincular depois
  solicitante_id     String?
  solicitante        Solicitante?   @relation("SolicitanteContratos", fields: [solicitante_id], references: [id], onDelete: Restrict)

  slaPolicyId        String?
  slaPolicy          SlaPolicy?     @relation(fields: [slaPolicyId], references: [id], onDelete: SetNull)

  // SLA diferenciado da empresa (sobrescreve a política, perde para o tipo de ticket)
  slaRespostaHoras   Int?           @map("sla_resposta_horas")
  slaSolucaoHoras    Int?           @map("sla_solucao_horas")

  status             ContractStatus @default(DRAFT)
  inicioVigencia     DateTime       @map("inicio_vigencia")
  fimVigencia        DateTime?      @map("fim_vigencia")
  renovacaoAutomatica Boolean       @default(false) @map("renovacao_automatica")
  diasAvisoVencimento Int[]         @default([30, 15, 7]) @map("dias_aviso_vencimento")

  // Comercial
  valorMensal        Decimal?       @db.Decimal(12, 2) @map("valor_mensal")
  penalidadeDescricao String?       @map("penalidade_descricao") @db.Text
  documentoUrl       String?        @map("documento_url") @db.Text
  observacoes        String?        @db.Text

  // Cancelamento
  canceladoEm        DateTime?      @map("cancelado_em")
  canceladoPor       String?        @map("cancelado_por")
  motivoCancelamento String?        @map("motivo_cancelamento") @db.Text

  // Renovação (rastreia a cadeia de contratos)
  renovadoDeId       String?        @unique @map("renovado_de_id")
  renovadoDe         Contrato?      @relation("ContratoRenovacao", fields: [renovadoDeId], references: [id], onDelete: SetNull)
  renovacoes         Contrato[]     @relation("ContratoRenovacao")

  created_at         DateTime       @default(now())
  updated_at         DateTime       @updatedAt
  created_by         String?
  updated_by         String?
  deleted_at         DateTime?

  termos             ContratoSlaTermo[]
  tickets            Ticket[]
  solicitanteVigente Solicitante?   @relation("SolicitanteContratoVigente")

  @@index([solicitante_id, status])
  @@index([status, fimVigencia])
}
```

Decisões:
- **N contratos por empresa com histórico de vigência** (decidido em 2026-10-26). `fimVigencia` nulo = vigência indeterminada.
- **1 contrato vigente por empresa** garantido **no banco** por `Solicitante.contratoVigenteId @unique` (ver 3.6) — não depende de validação em serviço.
- **Rascunho sem empresa**: `solicitante_id` nulo permite criar o contrato na página `/contratos` e vinculá-lo depois no cadastro do solicitante.
- **Reuso do [AuditLog](file:///g:/DEV/ticketbr/prisma/schema.prisma#L248-L262)** para trilha de alterações (`entity: "contrato"`), evitando tabela de versionamento nova.
- Contratos fora de vigência permanecem consultáveis (`EXPIRED` / `CANCELLED`) e servem para renovação e relatório histórico de cumprimento de SLA.

### 3.4 Termos de SLA do contrato

```prisma
model ContratoSlaTermo {
  id               String            @id @default(cuid())
  contratoId       String
  contrato         Contrato          @relation(fields: [contratoId], references: [id], onDelete: Cascade)

  escopo           SlaTermScope
  tipoTicketId     String?           @map("tipo_ticket_id")
  tipoTicket       Tipo_Ticket?      @relation(fields: [tipoTicketId], references: [id], onDelete: SetNull)
  categoriaId      String?           @map("categoria_id")
  categoria        Categoria_Ticket? @relation(fields: [categoriaId], references: [id], onDelete: SetNull)
  prioridade       TicketPriority?

  slaRespostaHoras Int?              @map("sla_resposta_horas")
  slaSolucaoHoras  Int               @map("sla_solucao_horas")
  ativo            Boolean           @default(true)

  created_at       DateTime          @default(now())
  updated_at       DateTime          @updatedAt
  created_by       String?
  updated_by       String?

  @@index([contratoId, ativo])
  @@index([tipoTicketId])
}
```

> Como o tipo de ticket tem prioridade máxima, termos com escopo `TIPO_TICKET` só produzem efeito quando o tipo estiver com `sla_horas` nulo. Termos de `CATEGORIA`, `PRIORIDADE` e `GLOBAL` são os que de fato diferenciam a empresa no dia a dia.

### 3.5 Snapshot no Ticket

```prisma
// campos adicionados em Ticket
  contrato_id        String?
  contrato           Contrato?  @relation(fields: [contrato_id], references: [id], onDelete: SetNull)
  slaHorasAplicadas  Int?       @map("sla_horas_aplicadas")
  slaFonte           SlaSource? @map("sla_fonte")

  // ticket aberto para solicitante com contrato bloqueado: não conta SLA
  foraDeContrato     Boolean    @default(false) @map("fora_de_contrato")

  @@index([contrato_id])
  @@index([foraDeContrato])
```

Gravar o snapshot em **todos** os pontos de criação: [ticket-service.ts](file:///g:/DEV/ticketbr/src/server/services/ticket-service.ts#L377) e [customer/tickets/route.ts](file:///g:/DEV/ticketbr/src/app/api/customer/tickets/route.ts#L180). Sem isso, editar um contrato mudaria retroativamente o prazo de tickets antigos.

### 3.6 Bloqueio do serviço no Solicitante

```prisma
// campos adicionados em Solicitante
  servico_bloqueado        Boolean             @default(false) @map("servico_bloqueado")
  servico_bloqueado_em     DateTime?           @map("servico_bloqueado_em")
  servico_bloqueado_motivo ServiceBlockReason? @map("servico_bloqueado_motivo")

  // garante no banco: no máximo 1 contrato vigente por empresa
  contratoVigenteId  String?   @unique @map("contrato_vigente_id")
  contratoVigente    Contrato? @relation("SolicitanteContratoVigente", fields: [contratoVigenteId], references: [id], onDelete: SetNull)

  contratos          Contrato[] @relation("SolicitanteContratos")

  @@index([servico_bloqueado])
```

Denormalizar o bloqueio (em vez de derivar por query) mantém o enforcement barato e permite indexar a listagem de clientes bloqueados.

**Dois níveis de bloqueio, com efeitos diferentes** (decisão de 2026-10-26):

| Nível | Campo | Efeito |
| --- | --- | --- |
| **Serviço** | `servico_bloqueado` (contrato cancelado/vencido/suspenso) | Interrompe o **atendimento**; o **acesso é mantido** (login, portal, histórico, chat) |
| **Acesso** | `Solicitante.status = false` (empresa desativada) | Bloqueia **todos os acessos** do cliente |

Ou seja: contrato bloqueado **não** derruba o acesso do cliente — apenas sinaliza e interrompe a prestação do serviço. Só a desativação da empresa (`status = false`, campo já existente no modelo) nega login e uso do portal.

### 3.7 Ajuste em `Tipo_Ticket`

```prisma
model Tipo_Ticket {
  // ...
  sla_horas  Int?   // era Int (obrigatório) — agora opcional
  // ...
}
```

Necessário para que a regra 2 da hierarquia seja "tipo define SLA" ou "tipo não define, cai no contrato". A UI de tipos de ticket precisa aceitar vazio e exibir "herda do contrato".

## 4. Ciclo de vida, renovação e bloqueio do serviço

Toda mudança de estado passa pelo `contract-service.ts` e, quando afeta o serviço, atualiza o `Solicitante` **na mesma transação** (`prisma.$transaction`), para nunca existir contrato cancelado com serviço ativo.

| Ação | Efeito no contrato | Efeito no solicitante |
| --- | --- | --- |
| Ativar (`DRAFT`/`SUSPENDED` → `ACTIVE`) | Define `contratoVigenteId` | **Desbloqueia** (`servico_bloqueado = false`) |
| Suspender (`ACTIVE` → `SUSPENDED`) | Libera a vaga de vigente | Bloqueia (`CONTRATO_SUSPENSO`) |
| Cancelar (`ACTIVE`/`SUSPENDED` → `CANCELLED`) | Grava `canceladoEm`, `canceladoPor`, motivo | Bloqueia (`CONTRATO_CANCELADO`) |
| Vencer (`ACTIVE` → `EXPIRED`, via cron) | Detecta `fimVigencia` no passado | Bloqueia (`CONTRATO_VENCIDO`) |
| Renovar | Cria novo contrato `ACTIVE` com `renovadoDeId` | Desbloqueia automaticamente |
| Vincular ao solicitante | Seta `solicitante_id` (rascunho → vinculado) | Nenhum até ativar |

Regras:
- Bloquear/desbloquear é sempre recalculado por `syncServiceStatus(solicitanteId)`: **serviço ativo ⇔ existe contrato vigente `ACTIVE`**. Isso torna a operação idempotente e evita estados inconsistentes.
- Contrato vencido sem renovação continua bloqueado até que exista um novo contrato vigente.

### 4.1 O que é interrompido

Decisão de 2026-10-26: **bloqueio de contrato mantém o acesso; só empresa desativada bloqueia todos os acessos.**

| Canal | Contrato bloqueado (cancelado / vencido / suspenso) | Empresa desativada (`status = false`) |
| --- | --- | --- |
| Login e navegação no portal (`/cliente`) | **Liberado**, com banner de contrato suspenso | **Bloqueado** (`UNAUTHORIZED`/`FORBIDDEN`) |
| Abertura de ticket pelo cliente | **Permitida**, mas o ticket nasce `foraDeContrato = true`: sem SLA, com badge "Fora de contrato" e fora das métricas de SLA | Bloqueada |
| Visualização de tickets, perfil e contrato | Liberado | Bloqueado |
| Chat do portal | Liberado (com aviso automático do bloqueio) | Bloqueado |
| Chat/WhatsApp inbound | Atendimento automático apenas informativo (aviso de contrato suspenso), sem criar ticket de serviço | Sem atendimento |
| Tickets internos (staff) | Criação permitida; UI avisa que o solicitante está bloqueado e o ticket entra como "Fora de contrato" | Bloqueada |
| Tickets já abertos | Continuam acessíveis para o staff concluir | Permanentemente indisponíveis para o cliente |

Implementação:
- `requireCustomerContext` em [customer-context.ts](file:///g:/DEV/ticketbr/src/server/services/customer-context.ts#L10-L51) passa a devolver `servico_bloqueado`/motivo **e** a rejeitar quando `solicitante.status = false` (checagem que hoje não existe).
- Novo `requireCustomerContextAtivo()` (empresa ativa) usado pelas rotas de escrita — as rotas de leitura usam o contexto simples.
- Criação de ticket marca `foraDeContrato` quando `servico_bloqueado = true` e não aplica SLA.

### 4.2 Cron de contratos

Novo `GET /api/cron/contract-scan` seguindo o padrão do [sla-scan](file:///g:/DEV/ticketbr/src/app/api/cron/sla-scan/route.ts#L7-L38) (`CRON_SECRET` + `guardAdmin`):

1. Marca `EXPIRED` os contratos `ACTIVE` com `fimVigencia < now` (e aplica renovação automática quando `renovacaoAutomatica`).
2. Recalcula `syncServiceStatus` dos solicitantes afetados (bloqueia vencidos, libera renovados).
3. Dispara avisos de vencimento próximo conforme `diasAvisoVencimento` (30/15/7 dias).

## 5. Camada de serviço

`src/server/services/sla-resolver.ts` — **função pura, sem DB**, totalmente testável:

```ts
export interface SlaResolutionContext {
  createdAt: Date;
  solutionSlaAt?: Date | null;
  tipoTicketSlaHours?: number | null;
  ticket?: { tipoTicketId?: string | null; categoriaId?: string | null; priority?: TicketPriority | null };
  contrato?: {
    slaSolucaoHoras?: number | null;
    slaRespostaHoras?: number | null;
    policy?: { slaSolucaoHoras: number; slaRespostaHoras?: number | null } | null;
    termos?: Array<{ escopo: SlaTermScope; tipoTicketId?: string|null; categoriaId?: string|null; prioridade?: TicketPriority|null; slaSolucaoHoras: number; ativo: boolean }>;
  } | null;
}

export function resolveSla(ctx: SlaResolutionContext): { deadline: Date; horas: number; fonte: SlaSource };
```

`src/server/services/contract-service.ts` concentra: CRUD, vinculação/desvinculação, ativação, suspensão, cancelamento, renovação, expiração e `syncServiceStatus`.

`ticket-status-policy.ts` passa a delegar para `resolveSla`, mantendo `resolveSlaDeadline` apenas como assinatura usada por [ticket-service.ts](file:///g:/DEV/ticketbr/src/server/services/ticket-service.ts#L139-L148). Como os dados são descartáveis (ver seção 9), **`COMPANY_SLA_HOURS` é removido na mesma entrega**, sem flag de compatibilidade nem fallback legado.

## 6. APIs

Seguindo o padrão de [projects](file:///g:/DEV/ticketbr/src/app/api/projects/schemas.ts) (zod + `guardStaff` no topo da rota):

| Método | Rota | Descrição |
| --- | --- | --- |
| GET/POST | `/api/contratos` | Lista (filtros: `q`, `status`, `solicitanteId`, `vigenteEm`, `vencendoEm`, paginação) / cria |
| GET/PUT/DELETE | `/api/contratos/[id]` | Detalhe, atualização, soft delete |
| POST | `/api/contratos/[id]/vincular` | Vincula/reatribui o contrato a um solicitante |
| POST | `/api/contratos/[id]/ativar` | Ativa (valida vigência e vaga de vigente) |
| POST | `/api/contratos/[id]/suspender` | Suspende e bloqueia o serviço |
| POST | `/api/contratos/[id]/cancelar` | Cancela (motivo obrigatório) e bloqueia o serviço |
| POST | `/api/contratos/[id]/renovar` | Cria novo contrato a partir do vigente, copiando os termos |
| GET/POST | `/api/contratos/[id]/termos-sla` | Lista / cria termo |
| PATCH/DELETE | `/api/contratos/[id]/termos-sla/[termoId]` | Edita / desativa termo |
| POST | `/api/contratos/[id]/preview-sla` | Simula a resolução do SLA para um contexto |
| GET | `/api/solicitantes/[id]/contratos` | Contratos da empresa (vigente + histórico) |
| POST | `/api/solicitantes/[id]/contrato` | **Vincular contrato** existente ao solicitante |
| DELETE | `/api/solicitantes/[id]/contrato` | Desvincular |
| GET/PUT | `/api/settings/sla-policy` | Política global padrão (ADMIN) |
| GET | `/api/cron/contract-scan` | Expiração, bloqueio/desbloqueio e avisos |

Regras: leitura para `ADMIN`/`AGENT`; escrita, cancelamento e política global só `ADMIN`. Toda mudança de estado grava `AuditLog`.

## 7. UI / UX

Novo item **Contratos** na [Sidebar](file:///g:/DEV/ticketbr/src/components/layout/Sidebar.tsx#L273-L303) (ícone `FiFileText`, entre "Inventário" e "Relatórios").

- **`/contratos`** — listagem (DataTable) com KPIs: ativos, vencendo em 30 dias, cancelados no mês, valor mensal total. Filtros **ocultos por padrão** sob botão sutil, no padrão já aplicado em [DashboardFilters.tsx](file:///g:/DEV/ticketbr/src/components/dashboard/DashboardFilters.tsx). Ações de linha: editar, ativar, suspender, cancelar, renovar, ver termos.
- **`/contratos/novo`** — criação do contrato (empresa opcional, vigência, valor, SLA, termos).
- **`/contratos/[id]`** — abas: **Dados do contrato** · **Termos de SLA** · **Vigência e comercial** · **Renovações** · **Histórico** (AuditLog). Cabeçalho com badges de status e de vigência (dias restantes) e ações do ciclo de vida.
- **Cancelamento** — modal com motivo obrigatório e aviso explícito: *"O serviço deste solicitante será interrompido até a renovação ou um novo contrato."*
- **Aba Termos de SLA** — editor de linhas (escopo, alvo, horas de resposta/solução, ativo) + painel de **prévia da resolução** ("NETMITT + Suporte N1 = 4h · origem: termo do contrato").
- **Vínculo pelo solicitante** — em `/cadastros/solicitante/[id]`, novo bloco **Contrato**: card com contrato vigente (status, vigência, valor, SLA efetivo) e botões **Vincular contrato** (modal com contratos disponíveis/rascunhos), **Renovar** e **Ver contrato**. Indicador de serviço bloqueado quando aplicável.
- **`/cadastros/solicitante`** — coluna/badge de contrato (vigente / vencendo / bloqueado) e filtro correspondente.
- **Portal do cliente** — acesso mantido com **banner persistente** em `/cliente` quando `servico_bloqueado`, informando motivo, contrato e contato comercial; tickets abertos nesse estado exibem badge **"Fora de contrato"**.
- **Desativação da empresa** — em `/cadastros/solicitante/[id]`, o toggle de `status` passa a avisar explicitamente: *"Desativar a empresa bloqueia todos os acessos do cliente."* (distinto do bloqueio por contrato, que apenas interrompe o serviço).
- **Kanban / dashboard** — filtro e badge para tickets `foraDeContrato`, que ficam fora dos KPIs de SLA e de cumprimento.
- **`/settings`** — nova aba **SLA Padrão** para a política global (abas atuais: Geral, Evolution, N8N, UAZAPI, Storage, Contatos, Logs, Notificações).
- **Ticket** — chip de SLA com tooltip da origem (`SlaSource`: "SLA do contrato · 4h" / "Tipo de ticket · 6h").

Tudo com componentes de [src/components/ui](file:///g:/DEV/ticketbr/src/components/ui) (`PageContainer`, `Card`, `Button`, `Input`, `Select`, `Modal`, `DataTable`, `Badge`, `FeedbackState`) e cores por `theme.tokens.color.status.*`. Se surgir padrão repetido (ex.: editor de linhas de termos), extrair para `src/components/ui` ou `src/components/forms` em vez de duplicar.

## 8. Notificações

Estender `NotificationType` com `CONTRACT_EXPIRING`, `CONTRACT_EXPIRED`, `CONTRACT_CANCELLED` e reaproveitar o serviço de [notifications](file:///g:/DEV/ticketbr/src/server/services/notifications.ts):

- Staff: aviso de vencimento (30/15/7 dias), confirmação de cancelamento, alerta de solicitante bloqueado.
- Cliente: aviso de vencimento e aviso de serviço interrompido (quando houver canal disponível).

## 9. Implantação e limpeza de dados

Decisão do usuário (2026-10-26): **tickets e dados existentes são de teste e podem ser excluídos.** Isso simplifica bastante a entrega — não há migração de dados nem compatibilidade a preservar.

1. Migration cria tabelas, enums e as novas colunas (`Ticket`, `Solicitante`, `Tipo_Ticket.sla_horas` → `Int?`).
2. Reset da base de desenvolvimento (`prisma migrate reset` + `prisma db seed`) em vez de backfill.
3. Seed cria apenas o essencial: **política global default (SlaPolicy, 8h)**. Contratos (ex.: ACEM 6h, NETMITT 4h, LP 8h) ficam como *fixtures* opcionais de demonstração, criáveis pela própria página `/contratos`.
4. `COMPANY_SLA_HOURS` e a branch `company` de `resolveSlaDeadline` são **removidos no mesmo PR**, com o teste correspondente atualizado.
5. **Recomendação**: subir todos os `Tipo_Ticket` com `sla_horas` nulo, para o SLA passar a vir do contrato / política global desde o início. Se algum tipo precisar de prazo fixo próprio, ele continua tendo prioridade máxima — basta preencher o campo.

## 10. Fases de entrega

| Fase | Escopo | Entregável |
| --- | --- | --- |
| **F1 — Núcleo do contrato** | Enums, `SlaPolicy`, `Contrato`, `Solicitante.contratoVigenteId`, `Tipo_Ticket.sla_horas` opcional, `sla-resolver.ts`, `contract-service.ts`, migration + seed, CRUD `/api/contratos`, ativar/suspender/cancelar, página `/contratos` + `/contratos/[id]` | Contratos criados, vinculados e com ciclo de vida funcionando |
| **F2 — SLA, vínculo e bloqueio** | Termos de SLA, prévia de resolução, snapshot no ticket, bloqueio do serviço (`syncServiceStatus` + enforcement no portal/tickets/chat), vínculo pelo cadastro do solicitante, política global em `/settings`, notificações | SLA diferenciado + interrupção do serviço por cancelamento |
| **F3 — Operação** | Cron `contract-scan`, renovação automática, avisos de vencimento, relatório de cumprimento de SLA e de valor por contrato (reuso de `/api/reports/management` e `KpiSnapshot`), janela de horário comercial + feriados, anexo do documento contratual | Gestão contratual e conformidade |

Ordem sugerida dentro de F1: schema/migration → `sla-resolver` com testes → `contract-service` com testes → APIs → UI.

## 11. Testes e gates

- `sla-resolver.test.ts` — precedência completa (manual > tipo de ticket > termo > contrato > política global > fallback), termo inativo, contrato fora de vigência.
- `contract-service.test.ts` — transições de estado válidas/inválidas, cancelamento exigindo motivo, renovação copiando termos, `syncServiceStatus` idempotente, unicidade de vigente por empresa, vinculação de rascunho.
- Testes de bloqueio: `requireCustomerContext` liberando leitura com `servico_bloqueado = true`, `requireCustomerContextAtivo` rejeitando quando `solicitante.status = false`, e criação de ticket marcando `foraDeContrato` sem aplicar SLA.
- Route tests com mock de Prisma para `/api/contratos*`, `/api/solicitantes/[id]/contrato` e `/api/cron/contract-scan`.
- Contract tests em `src/test/contracts` para o shape de resposta.
- Gates: `npm run typecheck`, `npx eslint`, `npx vitest run` sem regressão.

## 12. Riscos e decisões

1. **Sem risco de regressão de prazo**: com dados de teste descartáveis, não há tickets existentes a preservar — a base é reiniciada e o snapshot (`slaFonte`) nasce junto com o módulo.
2. **Bloqueio é irreversível sem ação humana**: serviço de um cliente cai por contrato vencido sem renovação. Mitigação: avisos em 30/15/7 dias + renovação automática opcional + tela de desbloqueio rápido no admin.
3. **Horas corridas vs. horas úteis** — resolvido em F3: o cálculo continua corrido por padrão e passa a suportar horas úteis como opt-in na política global de SLA (`horarioComercialAtivo` + `horarioComercial` + `feriados`), herdada pelos contratos. Helper puro em [business-hours.ts](file:///g:/DEV/ticketbr/src/server/services/business-hours.ts) e integração em [sla-resolver.ts](file:///g:/DEV/ticketbr/src/server/services/sla-resolver.ts).
4. **Pausa de SLA** (`pauseSla`, `pausedTotalSeconds`) continua como está — o contrato define o prazo, não a mecânica de pausa.
5. **Decidido**: tipo de ticket com prioridade máxima, SLA do contrato secundário → `Tipo_Ticket.sla_horas` passa a opcional em F1.
6. **Decidido**: N contratos por empresa com histórico de vigência, 1 vigente por vez.
7. **Decidido (2026-10-26)**: bloqueio por contrato **mantém o acesso** do cliente (portal, histórico, chat) e interrompe apenas a prestação do serviço — tickets abertos nesse estado nascem `foraDeContrato`, sem SLA. **Todos os acessos** só são bloqueados quando a empresa é desativada (`Solicitante.status = false`).
8. **Decidido (2026-10-26)**: dados existentes são de teste e podem ser excluídos → sem migração/backfill e sem flag de compatibilidade; `COMPANY_SLA_HOURS` sai no mesmo PR.
9. **Pendente de confirmação**: tipos de ticket já cadastrados. Recomendação: subir todos com `sla_horas` nulo para o contrato/política global valer desde o início (ver seção 9, item 5).
