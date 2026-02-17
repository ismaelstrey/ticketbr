import { getPrismaClient } from "@/lib/prisma";
import {
  DbStatus,
  fromPrismaPriority,
  fromPrismaStatus,
  toPrismaPriority,
  toPrismaStatus,
  UiPriority,
  UiStatus
} from "@/server/ticket-mappers";

type CreateTicketInput = {
  empresa: string;
  solicitante: string;
  assunto: string;
  descricao?: string;
  prioridade?: UiPriority;
  status?: UiStatus;
  operador?: string;
  contato?: string;
  tipoTicket?: string;
  categoria?: string;
  mesaTrabalho?: string;
};

type UpdateTicketInput = Partial<CreateTicketInput> & {
  pauseReason?: string;
};

function mapTicket(ticket: any) {
  return {
    id: ticket.id,
    number: ticket.number,
    empresa: ticket.company,
    solicitante: ticket.requester,
    assunto: ticket.subject,
    descricao: ticket.description,
    prioridade: fromPrismaPriority(ticket.priority),
    status: fromPrismaStatus(ticket.status),
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
    roadmap: (ticket.events ?? [])
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((event: any) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description,
        fromStatus: event.fromStatus ? fromPrismaStatus(event.fromStatus) : null,
        toStatus: event.toStatus ? fromPrismaStatus(event.toStatus) : null,
        pauseReason: event.pauseReason,
        metadata: event.metadata,
        author: event.author,
        createdAt: event.createdAt
      }))
  };
}

export async function listTickets() {
  const prisma = await getPrismaClient();
  const tickets = await prisma.ticket.findMany({
    include: { events: true },
    orderBy: { createdAt: "desc" }
  });

  return tickets.map(mapTicket);
}

export async function getTicketById(id: string) {
  const prisma = await getPrismaClient();
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { events: true }
  });

  return ticket ? mapTicket(ticket) : null;
}

export async function createTicket(input: CreateTicketInput) {
  const prisma = await getPrismaClient();
  const status = input.status ? toPrismaStatus(input.status) : "TODO";
  const priority = input.prioridade ? toPrismaPriority(input.prioridade) : undefined;

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
  const prisma = await getPrismaClient();
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

  if (input.status) {
    data.status = toPrismaStatus(input.status);
  }

  if (input.prioridade) {
    data.priority = toPrismaPriority(input.prioridade);
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
  const prisma = await getPrismaClient();
  try {
    await prisma.ticket.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function changeTicketStatus(id: string, status: UiStatus, author?: string, pauseReason?: string) {
  const prisma = await getPrismaClient();
  const current = await prisma.ticket.findUnique({ where: { id } });
  if (!current) {
    return null;
  }

  const nextStatus = toPrismaStatus(status);

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      status: nextStatus,
      pausedReason: nextStatus === "PAUSED" ? pauseReason ?? "" : null
    },
    include: { events: true }
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

  return mapTicket(updated);
}

export async function addTicketInteraction(
  id: string,
  payload: { title: string; description?: string; author?: string; type?: "COMMENT" | "NOTE" }
) {
  const prisma = await getPrismaClient();
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
  const prisma = await getPrismaClient();
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
    status: fromPrismaStatus(ticket.status as DbStatus),
    events: ticket.events.map((event: any) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      fromStatus: event.fromStatus ? fromPrismaStatus(event.fromStatus) : null,
      toStatus: event.toStatus ? fromPrismaStatus(event.toStatus) : null,
      pauseReason: event.pauseReason,
      metadata: event.metadata,
      author: event.author,
      createdAt: event.createdAt
    }))
  };
}
