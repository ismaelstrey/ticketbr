import { Prisma, prisma } from "@/lib/prisma";
import { CreateTicketInput, UpdateTicketInput } from "@/lib/validations/ticket";
import {
  DbStatus,
  fromPrismaPriority,
  fromPrismaStatus,
  toPrismaPriority,
  toPrismaStatus,
  UiPriority,
  UiStatus
} from "@/server/ticket-mappers";
import type { TicketPriority, TicketStatus } from "../../../prisma/generated/enums";
import { assertTransition, resolveSlaDeadline } from "./ticket-status-policy";
import { notifyTicketAssigned, notifyTicketComment, notifyTicketStatusChanged } from "./notifications";

const LEGACY_MISSING_COLUMNS = ["pauseSla", "pausedStartedAt", "pausedTotalSeconds"];

/**
 * Executa um disparo de notificação em modo best-effort: eventuais falhas são
 * registradas no log e nunca interrompem o fluxo principal do ticket.
 */
async function notifyBestEffort(label: string, task: () => Promise<unknown>): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.warn("[Service] falha ao disparar notificação", {
      label,
      error: error instanceof Error ? error.message : "unknown"
    });
  }
}

function isMissingPauseColumnsError(error: unknown): boolean {
  const plainError = (error && typeof error === "object" ? error : {}) as Record<string, unknown>;
  const message = [
    error instanceof Error ? error.message : "",
    typeof plainError.originalMessage === "string" ? plainError.originalMessage : "",
    typeof plainError.message === "string" ? plainError.message : "",
    JSON.stringify(error)
  ]
    .filter(Boolean)
    .join(" | ");

  const hasLegacyColumnName = LEGACY_MISSING_COLUMNS.some((column) => message.includes(column));

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2022") {
      const column = String((error.meta as Record<string, unknown> | undefined)?.column ?? "");
      if (LEGACY_MISSING_COLUMNS.some((candidate) => column.includes(candidate))) {
        return true;
      }
      return hasLegacyColumnName;
    }
  }

  const originalCode = String(plainError.originalCode ?? "");
  const kind = String(plainError.kind ?? "");

  if ((originalCode === "42703" || kind === "ColumnNotFound") && hasLegacyColumnName) {
    return true;
  }

  return (
    message.includes("P2022") && hasLegacyColumnName
  ) || (message.includes("does not exist") && hasLegacyColumnName);
}

// Relacionamentos carregados para que a leitura use as relações como fonte de verdade
const ticketRelationSelect = {
  tipo_ticket: { select: { id: true, nome: true, sla_horas: true } },
  categoria: { select: { id: true, nome: true } },
  mesa_trabalho_rel: { select: { id: true, nome: true } },
  operador_rel: { select: { id: true, nome: true } },
  solicitante: { select: { id: true, nome_fantasia: true, razao_social: true } }
} as const;

const ticketRelationsInclude = {
  events: true,
  ...ticketRelationSelect
} as const;

// Projeção usada apenas quando o banco ainda não possui as colunas de pausa de SLA.
// Seleciona explicitamente os campos existentes (sem as colunas de pausa ausentes).
const ticketCompatSelect = {
  id: true,
  number: true,
  subject: true,
  description: true,
  status: true,
  priority: true,
  contact: true,
  responseSlaAt: true,
  solutionSlaAt: true,
  pausedReason: true,
  createdAt: true,
  updatedAt: true,
  events: true,
  ...ticketRelationSelect
} as const;

async function findTicketsWithCompatibility() {
  try {
    return await prisma.ticket.findMany({
      include: ticketRelationsInclude,
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    if (!isMissingPauseColumnsError(error)) {
      throw error;
    }

    console.warn("[Service] DB sem colunas de pausa de SLA. Usando fallback compatível para listagem.");
    return prisma.ticket.findMany({
      select: ticketCompatSelect,
      orderBy: { createdAt: "desc" }
    });
  }
}

async function findTicketByIdWithCompatibility(id: string) {
  try {
    return await prisma.ticket.findUnique({
      where: { id },
      include: ticketRelationsInclude
    });
  } catch (error) {
    if (!isMissingPauseColumnsError(error)) {
      throw error;
    }

    console.warn(`[Service] DB sem colunas de pausa de SLA. Usando fallback compatível para ticket ${id}.`);
    return prisma.ticket.findUnique({
      where: { id },
      select: ticketCompatSelect
    });
  }
}

function resolveSlaDeadlineForTicket(ticket: any): Date {
  // A empresa/solicitante agora vem da relação, não mais do campo legado
  const nomeSolicitante = ticket.solicitante?.nome_fantasia || ticket.solicitante?.razao_social || null;
  return resolveSlaDeadline({
    createdAt: ticket.createdAt,
    solutionSlaAt: ticket.solutionSlaAt,
    tipoTicketSlaHours: ticket.tipo_ticket?.sla_horas ?? null,
    company: nomeSolicitante
  });
}

function calculateElapsedWithOptionalPause(
  createdAt: Date,
  pausedTotalSeconds: number,
  pauseSla?: boolean | null,
  pausedStartedAt?: Date | null,
  status?: DbStatus | null
): number {
  const baseElapsed = Date.now() - createdAt.getTime();
  const persistedPausedMs = Math.max(0, pausedTotalSeconds || 0) * 1000;

  if (!pauseSla) {
    return Math.max(baseElapsed, 0);
  }

  const activePausedMs = status === "PAUSED" && pausedStartedAt
    ? Math.max(Date.now() - pausedStartedAt.getTime(), 0)
    : 0;

  return Math.max(baseElapsed - persistedPausedMs - activePausedMs, 0);
}

function calculateSlaProgress(
  createdAt: Date,
  slaAt?: Date | null,
  pausedTotalSeconds: number = 0,
  pauseSla?: boolean | null,
  pausedStartedAt?: Date | null,
  status?: DbStatus | null
): number {
  if (!slaAt) return 0;

  const total = slaAt.getTime() - createdAt.getTime();
  const elapsed = calculateElapsedWithOptionalPause(createdAt, pausedTotalSeconds, pauseSla, pausedStartedAt, status);

  if (total <= 0) return 100;

  const progress = Math.round((elapsed / total) * 100);
  return Math.min(Math.max(progress, 0), 100);
}

function mapTicket(ticket: any) {
  // Nome do cliente resolvido pela relação (fonte de verdade)
  const nomeSolicitante = ticket.solicitante?.nome_fantasia || ticket.solicitante?.razao_social || null;

  return {
    id: ticket.id,
    number: ticket.number,
    empresa: nomeSolicitante,
    solicitante: nomeSolicitante,
    assunto: ticket.subject,
    descricao: ticket.description,
    prioridade: fromPrismaPriority(ticket.priority as any),
    status: fromPrismaStatus(ticket.status as any),
    data: ticket.createdAt.toLocaleString("pt-BR", { 
        day: "2-digit", month: "2-digit", year: "numeric", 
        hour: "2-digit", minute: "2-digit" 
    }),
    progressoSla: calculateSlaProgress(
      ticket.createdAt,
      resolveSlaDeadlineForTicket(ticket),
      ticket.pausedTotalSeconds ?? 0,
      ticket.pauseSla,
      ticket.pausedStartedAt,
      ticket.status
    ),
    progressoTarefa: 0, // Campo não existe no banco, retornando 0 por padrão
    operador: ticket.operador_rel?.nome ?? null,
    contato: ticket.contact,
    tipoTicket: ticket.tipo_ticket?.nome ?? null,
    categoria: ticket.categoria?.nome ?? null,
    mesaTrabalho: ticket.mesa_trabalho_rel?.nome ?? null,
    dataCriacao: ticket.createdAt,
    dataAtualizacao: ticket.updatedAt,
    slaResposta: ticket.responseSlaAt,
    slaSolucao: ticket.solutionSlaAt,
    pauseReason: ticket.pausedReason,
    pauseSla: ticket.pauseSla,
    interacoes: (ticket.events ?? [])
      .filter((e: any) => e.type === "COMMENT" || e.type === "NOTE")
      .map((e: any) => ({
        id: e.id,
        autor: e.author,
        tempo: e.createdAt.toLocaleString("pt-BR"),
        mensagem: e.description,
        corBorda: e.type === "NOTE" ? "vermelho" : "azul"
      })),
    roadmap: (ticket.events ?? [])
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((event: any) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description,
        fromStatus: event.fromStatus ? fromPrismaStatus(event.fromStatus as any) : null,
        toStatus: event.toStatus ? fromPrismaStatus(event.toStatus as any) : null,
        pauseReason: event.pauseReason,
        pauseSla: event.metadata?.pauseSla,
        metadata: event.metadata,
        author: event.author,
        createdAt: event.createdAt
      }))
  };
}

export async function listTickets() {
  try {
    const tickets = await findTicketsWithCompatibility();
    console.info(`[Service] Found ${tickets.length} tickets`);
    return tickets.map(mapTicket);
  } catch (error) {
    console.error("[Service] Error listing tickets:", error);
    return [];
  }
}

export async function getTicketById(id: string) {
  const ticket = await findTicketByIdWithCompatibility(id);
  return ticket ? mapTicket(ticket) : null;
}

async function resolveSolicitanteId(input: CreateTicketInput | UpdateTicketInput) {
  const direct = (input as any).solicitanteId as string | undefined;
  if (direct && direct.trim()) return direct.trim();

  const candidates = [input.empresa, input.solicitante]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  if (!candidates.length) return null;

  const solicitante = await prisma.solicitante.findFirst({
    where: {
      OR: [
        ...candidates.map((name) => ({ nome_fantasia: { equals: name, mode: "insensitive" as const } })),
        ...candidates.map((name) => ({ razao_social: { equals: name, mode: "insensitive" as const } }))
      ]
    },
    select: { id: true }
  });

  return solicitante?.id ?? null;
}

/** Resolve o ID do tipo de ticket a partir do ID informado ou do nome (case-insensitive). */
async function resolveTipoTicketId(input: CreateTicketInput | UpdateTicketInput): Promise<string | null> {
  if (input.tipoTicketId?.trim()) return input.tipoTicketId.trim();

  const nome = String(input.tipoTicket ?? "").trim();
  if (!nome) return null;

  const tipo = await prisma.tipo_Ticket.findFirst({
    where: { nome: { equals: nome, mode: "insensitive" } },
    select: { id: true }
  });
  return tipo?.id ?? null;
}

/** Resolve o ID da categoria, priorizando a categoria vinculada ao tipo de ticket. */
async function resolveCategoriaId(
  input: CreateTicketInput | UpdateTicketInput,
  tipoTicketId: string | null
): Promise<string | null> {
  if (input.categoriaId?.trim()) return input.categoriaId.trim();

  const nome = String(input.categoria ?? "").trim();
  if (!nome) return null;

  const categoria = await prisma.categoria_Ticket.findFirst({
    where: {
      nome: { equals: nome, mode: "insensitive" },
      ...(tipoTicketId ? { tipo_ticket_id: tipoTicketId } : {})
    },
    select: { id: true }
  });
  if (categoria) return categoria.id;

  // Fallback: procura a categoria apenas pelo nome
  const fallback = await prisma.categoria_Ticket.findFirst({
    where: { nome: { equals: nome, mode: "insensitive" } },
    select: { id: true }
  });
  return fallback?.id ?? null;
}

/** Resolve o ID da mesa de trabalho a partir do ID informado ou do nome. */
async function resolveMesaTrabalhoId(input: CreateTicketInput | UpdateTicketInput): Promise<string | null> {
  if (input.mesaTrabalhoId?.trim()) return input.mesaTrabalhoId.trim();

  const nome = String(input.mesaTrabalho ?? "").trim();
  if (!nome) return null;

  const mesa = await prisma.mesa_Trabalho.findFirst({
    where: { nome: { equals: nome, mode: "insensitive" } },
    select: { id: true }
  });
  return mesa?.id ?? null;
}

/** Resolve o ID do operador a partir do ID informado ou do nome. */
async function resolveOperadorId(input: CreateTicketInput | UpdateTicketInput): Promise<string | null> {
  if (input.operadorId?.trim()) return input.operadorId.trim();

  const nome = String(input.operador ?? "").trim();
  if (!nome) return null;

  const operador = await prisma.operador.findFirst({
    where: { nome: { equals: nome, mode: "insensitive" } },
    select: { id: true }
  });
  return operador?.id ?? null;
}

export async function createTicket(input: CreateTicketInput) {
  // Safe cast to Prisma enum strings
  const status = (input.status ? toPrismaStatus(input.status as UiStatus) : "TODO") as TicketStatus;
  const priority = (input.prioridade ? toPrismaPriority(input.prioridade as UiPriority) : undefined) as TicketPriority | undefined;
  const solicitanteId = await resolveSolicitanteId(input);
  // Resolve os relacionamentos (fonte de verdade) a partir dos IDs ou nomes informados
  const tipoTicketId = await resolveTipoTicketId(input);
  const categoriaId = await resolveCategoriaId(input, tipoTicketId);
  const mesaTrabalhoId = await resolveMesaTrabalhoId(input);
  const operadorId = await resolveOperadorId(input);

  const ticket = await prisma.ticket.create({
    data: {
      subject: input.assunto,
      description: input.descricao,
      status,
      priority,
      contact: input.contato,
      ...(solicitanteId ? { solicitante_id: solicitanteId } : {}),
      ...(tipoTicketId ? { tipo_ticket_id: tipoTicketId } : {}),
      ...(categoriaId ? { categoria_id: categoriaId } : {}),
      ...(mesaTrabalhoId ? { mesa_trabalho_id: mesaTrabalhoId } : {}),
      ...(operadorId ? { operador_id: operadorId } : {}),
      events: {
        create: {
          type: "CREATED",
          title: "Ticket criado",
          description: "Ticket criado via API do Next.js",
          toStatus: status,
          author: input.operador ?? "Sistema"
        }
      }
    },
    include: ticketRelationsInclude
  });

  return mapTicket(ticket);
}

export async function updateTicket(id: string, input: UpdateTicketInput) {
  const current = await prisma.ticket.findUnique({ where: { id } });
  if (!current) {
    return null;
  }

  const data: Record<string, unknown> = {
    subject: input.assunto,
    description: input.descricao,
    contact: input.contato
  };

  // Remove undefined keys
  Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

  if (input.status) {
    data.status = toPrismaStatus(input.status as UiStatus);
  }

  if (input.prioridade) {
    data.priority = toPrismaPriority(input.prioridade as UiPriority);
  }

  if (input.pauseReason !== undefined) {
    data.pausedReason = input.pauseReason;
  }

  if (input.pauseSla !== undefined) {
    data.pauseSla = input.pauseSla;
  }

  const solicitanteId = await resolveSolicitanteId(input);
  if (solicitanteId) {
    data.solicitante_id = solicitanteId;
  }

  // Resolve e sincroniza os relacionamentos (fonte de verdade) com base nos IDs/nomes
  const tipoTicketId = (await resolveTipoTicketId(input)) ?? current.tipo_ticket_id ?? null;
  if (tipoTicketId) {
    data.tipo_ticket_id = tipoTicketId;
  }
  const categoriaId = await resolveCategoriaId(input, tipoTicketId);
  if (categoriaId) {
    data.categoria_id = categoriaId;
  }
  const mesaTrabalhoId = await resolveMesaTrabalhoId(input);
  if (mesaTrabalhoId) {
    data.mesa_trabalho_id = mesaTrabalhoId;
  }
  const operadorId = await resolveOperadorId(input);
  // Detecta troca de responsável para disparar a notificação de atribuição
  const operadorChanged = Boolean(operadorId) && operadorId !== current.operador_id;
  if (operadorId) {
    data.operador_id = operadorId;
  }

  await prisma.ticket.update({ where: { id }, data });

  await prisma.ticketEvent.create({
    data: {
      ticketId: id,
      type: "UPDATED",
      title: "Dados do ticket atualizados",
      description: "Campos gerais foram alterados.",
      author: input.operador ?? "Sistema"
    }
  });

  if (operadorChanged) {
    await notifyBestEffort("atribuição de operador", () => notifyTicketAssigned({ ticketId: id }));
  }

  return getTicketById(id);
}

export async function deleteTicket(id: string) {
  try {
    await prisma.ticket.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function changeTicketStatus(id: string, status: UiStatus, author?: string, pauseReason?: string, pauseSla?: boolean) {
  const current = await findTicketByIdWithCompatibility(id);
  if (!current) {
    return null;
  }

  const nextStatus = toPrismaStatus(status) as TicketStatus;

  // Transição idempotente: mesmo status não gera atualização nem evento
  if (current.status === nextStatus) {
    return getTicketById(id);
  }

  // Valida a transição pela máquina de estados antes de persistir
  assertTransition(current.status as DbStatus, nextStatus);

  const now = new Date();
  const pausedStartedAt = (current as any).pausedStartedAt as Date | null | undefined;
  const currentPauseSla = Boolean((current as any).pauseSla);
  const currentPausedTotalSeconds = Number((current as any).pausedTotalSeconds ?? 0) || 0;
  const shouldClosePausedWindow = current.status === "PAUSED" && currentPauseSla && pausedStartedAt && nextStatus !== "PAUSED";
  const pauseWindowSeconds = shouldClosePausedWindow && pausedStartedAt
    ? Math.max(Math.round((now.getTime() - pausedStartedAt.getTime()) / 1000), 0)
    : 0;

  const fullUpdate = {
    status: nextStatus,
    pausedReason: nextStatus === "PAUSED" ? pauseReason ?? "" : null,
    pauseSla: nextStatus === "PAUSED" ? Boolean(pauseSla) : false,
    pausedStartedAt: nextStatus === "PAUSED" && pauseSla ? now : null,
    pausedTotalSeconds: currentPausedTotalSeconds + pauseWindowSeconds
  };

  try {
    await prisma.ticket.update({ where: { id }, data: fullUpdate as any });
  } catch (error) {
    if (!isMissingPauseColumnsError(error)) {
      throw error;
    }

    console.warn("[Service] DB sem colunas de pausa de SLA. Atualizando somente status/pausedReason.");
    await prisma.ticket.update({
      where: { id },
      data: {
        status: nextStatus,
        pausedReason: nextStatus === "PAUSED" ? pauseReason ?? "" : null
      } as any
    });
  }

  try {
    await prisma.ticketEvent.create({
      data: {
        ticketId: id,
        type: nextStatus === "PAUSED" ? "PAUSED" : "STATUS_CHANGED",
        title: `Status alterado para ${status}`,
        fromStatus: current.status,
        toStatus: nextStatus,
        pauseReason,
        metadata: nextStatus === "PAUSED" ? { pauseSla: Boolean(pauseSla) } : undefined,
        author: author ?? "Sistema"
      }
    });
  } catch (error) {
    if (!isMissingPauseColumnsError(error)) {
      throw error;
    }

    await prisma.ticketEvent.create({
      data: {
        ticketId: id,
        type: nextStatus === "PAUSED" ? "PAUSED" : "STATUS_CHANGED",
        title: `Status alterado para ${status}`,
        fromStatus: current.status,
        toStatus: nextStatus,
        author: author ?? "Sistema"
      } as any
    });
  }

  // Cliente é avisado (in-app + email) sobre a mudança de status
  await notifyBestEffort("mudança de status", () =>
    notifyTicketStatusChanged({ ticketId: id, fromStatus: current.status, toStatus: nextStatus })
  );

  return getTicketById(id);
}

export async function addTicketInteraction(
  id: string,
  payload: { title: string; description?: string; author?: string; type?: "COMMENT" | "NOTE" }
) {
  const exists = await prisma.ticket.findUnique({ where: { id } });
  if (!exists) {
    return null;
  }

  const eventType = payload.type === "NOTE" ? "NOTE" : "COMMENT";

  await prisma.ticketEvent.create({
    data: {
      ticketId: id,
      type: eventType,
      title: payload.title,
      description: payload.description,
      author: payload.author ?? "Sistema"
    }
  });

  // Interações do tipo COMMENT (staff) avisam o cliente; notas internas não notificam
  if (eventType === "COMMENT") {
    await notifyBestEffort("novo comentário", () =>
      notifyTicketComment({
        ticketId: id,
        fromCustomer: false,
        author: payload.author ?? "Sistema",
        message: payload.description ?? payload.title
      })
    );
  }

  return getTicketById(id);
}

export async function getTicketRoadmap(id: string) {
  const ticket = await findTicketByIdWithCompatibility(id);

  if (!ticket) {
    return null;
  }

  const events = Array.isArray((ticket as any).events)
    ? [...((ticket as any).events as any[])].sort((a, b) => {
        const at = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      })
    : [];

  return {
    ticketId: ticket.id,
    ticketNumber: ticket.number,
    subject: ticket.subject,
    status: fromPrismaStatus(ticket.status as any),
    events: events.map((event: any) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      fromStatus: event.fromStatus ? fromPrismaStatus(event.fromStatus as any) : null,
      toStatus: event.toStatus ? fromPrismaStatus(event.toStatus as any) : null,
      pauseReason: event.pauseReason,
      metadata: event.metadata,
      author: event.author,
      createdAt: event.createdAt
    }))
  };
}
