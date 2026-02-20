import { prisma } from "@/lib/prisma";
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

function calculateSlaProgress(createdAt: Date, slaAt?: Date | null): number {
  if (!slaAt) return 0;
  
  const total = slaAt.getTime() - createdAt.getTime();
  const elapsed = Date.now() - createdAt.getTime();
  
  if (total <= 0) return 100;
  
  const progress = Math.round((elapsed / total) * 100);
  return Math.min(Math.max(progress, 0), 100);
}

function mapTicket(ticket: any) {
  return {
    id: ticket.id,
    number: ticket.number,
    empresa: ticket.company,
    solicitante: ticket.requester,
    assunto: ticket.subject,
    descricao: ticket.description,
    prioridade: fromPrismaPriority(ticket.priority as any),
    status: fromPrismaStatus(ticket.status as any),
    data: ticket.createdAt.toLocaleString("pt-BR", { 
        day: "2-digit", month: "2-digit", year: "numeric", 
        hour: "2-digit", minute: "2-digit" 
    }),
    progressoSla: calculateSlaProgress(ticket.createdAt, ticket.solutionSlaAt),
    progressoTarefa: 0, // Campo não existe no banco, retornando 0 por padrão
    operador: ticket.operator,
    contato: ticket.contact,
    tipoTicket: ticket.ticketType,
    categoria: ticket.category,
    mesaTrabalho: ticket.workbench,
    dataCriacao: ticket.createdAt,
    dataAtualizacao: ticket.updatedAt,
    slaResposta: ticket.responseSlaAt,
    slaSolucao: ticket.solutionSlaAt,
    pauseReason: ticket.pausedReason,
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
        metadata: event.metadata,
        author: event.author,
        createdAt: event.createdAt
      }))
  };
}

export async function listTickets() {
  try {
    const tickets = await prisma.ticket.findMany({
      include: { events: true },
      orderBy: { createdAt: "desc" }
    });
    console.log(`[Service] Found ${tickets.length} tickets`);
    return tickets.map(mapTicket);
  } catch (error) {
    console.error("[Service] Error listing tickets:", error);
    return [];
  }
}

export async function getTicketById(id: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { events: true }
  });

  return ticket ? mapTicket(ticket) : null;
}

export async function createTicket(input: CreateTicketInput) {
  // Safe cast to Prisma enum strings
  const status = (input.status ? toPrismaStatus(input.status as UiStatus) : "TODO") as TicketStatus;
  const priority = (input.prioridade ? toPrismaPriority(input.prioridade as UiPriority) : undefined) as TicketPriority | undefined;

  const ticket = await prisma.ticket.create({
    data: {
      company: input.empresa,
      requester: input.solicitante,
      subject: input.assunto,
      description: input.descricao,
      status,
      priority,
      operator: input.operador,
      contact: input.contato,
      ticketType: input.tipoTicket,
      category: input.categoria,
      workbench: input.mesaTrabalho,
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
    include: { events: true }
  });

  return mapTicket(ticket);
}

export async function updateTicket(id: string, input: UpdateTicketInput) {
  const current = await prisma.ticket.findUnique({ where: { id } });
  if (!current) {
    return null;
  }

  const data: Record<string, unknown> = {
    company: input.empresa,
    requester: input.solicitante,
    subject: input.assunto,
    description: input.descricao,
    operator: input.operador,
    contact: input.contato,
    ticketType: input.tipoTicket,
    category: input.categoria,
    workbench: input.mesaTrabalho
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

export async function changeTicketStatus(id: string, status: UiStatus, author?: string, pauseReason?: string) {
  const current = await prisma.ticket.findUnique({ where: { id } });
  if (!current) {
    return null;
  }

  const nextStatus = toPrismaStatus(status) as TicketStatus;

  await prisma.ticket.update({
    where: { id },
    data: {
      status: nextStatus,
      pausedReason: nextStatus === "PAUSED" ? pauseReason ?? "" : null
    }
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: id,
      type: nextStatus === "PAUSED" ? "PAUSED" : "STATUS_CHANGED",
      title: `Status alterado para ${status}`,
      fromStatus: current.status,
      toStatus: nextStatus,
      pauseReason,
      author: author ?? "Sistema"
    }
  });

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

  await prisma.ticketEvent.create({
    data: {
      ticketId: id,
      type: payload.type === "NOTE" ? "NOTE" : "COMMENT",
      title: payload.title,
      description: payload.description,
      author: payload.author ?? "Sistema"
    }
  });

  return getTicketById(id);
}

export async function getTicketRoadmap(id: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!ticket) {
    return null;
  }

  return {
    ticketId: ticket.id,
    ticketNumber: ticket.number,
    subject: ticket.subject,
    status: fromPrismaStatus(ticket.status as any),
    events: ticket.events.map((event: any) => ({
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
