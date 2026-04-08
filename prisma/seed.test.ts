import { describe, expect, it, vi, beforeEach } from "vitest";
import { seedDatabase } from "./seed";

function createPrismaStub() {
  const idSeq = (() => {
    let value = 0;
    return () => {
      value += 1;
      return value;
    };
  })();

  const categories: Array<{ id: string; nome: string; tipo_ticket_id: string }> = [];

  const tipo_Ticket = {
    upsert: vi.fn(async (args: any) => ({ id: `tt_${args.where.nome}`, nome: args.where.nome }))
  };

  const categoria_Ticket = {
    upsert: vi.fn(async (args: any) => {
      const id = `cat_${idSeq()}`;
      categories.push({ id, nome: args.create.nome, tipo_ticket_id: args.create.tipo_ticket_id });
      return { id, nome: args.create.nome, tipo_ticket_id: args.create.tipo_ticket_id };
    }),
    findMany: vi.fn(async () => categories),
    findFirst: vi.fn(async (args: any) => ({ id: `cat_${args.where.nome}`, nome: args.where.nome }))
  };

  const user = {
    upsert: vi.fn(async (args: any) => ({
      id: `u_${args.where.email}`,
      email: args.where.email,
      name: args.create?.name ?? args.update?.name ?? "User",
      password: args.update?.password ?? args.create?.password ?? "pw",
      role: args.update?.role ?? args.create?.role ?? "AGENT"
    })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    findUnique: vi.fn(async (args: any) => ({ id: args.where.id, role: "ADMIN" }))
  };

  const operador = {
    upsert: vi.fn(async () => ({ id: "op_admin", nome: "Administrador", email: "admin@ticketbr.com" })),
    deleteMany: vi.fn(async () => ({ count: 0 }))
  };

  const mesa_Trabalho = {
    upsert: vi.fn(async () => ({ id: "mesa-n1-default", nome: "Nível 1 - Geral" }))
  };

  let solicitanteIndex = 0;
  const solicitante = {
    upsert: vi.fn(async (args: any) => {
      solicitanteIndex += 1;
      return {
        id: `s_${solicitanteIndex}`,
        razao_social: args.create.razao_social,
        nome_fantasia: args.create.nome_fantasia,
        cnpj: args.where.cnpj,
        email: args.create.email,
        telefone: args.create.telefone
      };
    }),
    findUnique: vi.fn(async () => ({ nome_fantasia: "Tech Sol", razao_social: "Tech Solutions" })),
    deleteMany: vi.fn(async () => ({ count: 0 }))
  };

  const whatsAppContact = {
    upsert: vi.fn(async (args: any) => ({
      id: args.where.id,
      remoteJid: args.create?.remoteJid ?? args.update?.remoteJid ?? args.where.id,
      pushName: args.create?.pushName ?? args.update?.pushName ?? null
    }))
  };

  const funcionario = {
    upsert: vi.fn(async (args: any) => ({ id: `f_${args.create.userId}`, userId: args.create.userId }))
  };

  const ticket = {
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    create: vi.fn(async (args: any) => ({
      id: `t_${idSeq()}`,
      number: idSeq(),
      subject: args.data.subject,
      solicitante_id: args.data.solicitante_id
    })),
    deleteMany: vi.fn(async () => ({ count: 0 }))
  };

  const conversation = {
    upsert: vi.fn(async (args: any) => ({ id: `c_${args.where.waChatId}`, waChatId: args.where.waChatId })),
    deleteMany: vi.fn(async () => ({ count: 0 }))
  };

  const message = {
    upsert: vi.fn(async () => ({ id: `m_${idSeq()}` }))
  };

  const chatConversation = {
    findFirst: vi.fn(async () => null),
    create: vi.fn(async () => ({ id: `cc_${idSeq()}` })),
    deleteMany: vi.fn(async () => ({ count: 0 }))
  };

  const ticketEvent = {
    create: vi.fn(async () => ({ id: `te_${idSeq()}` }))
  };

  const auditLog = {
    create: vi.fn(async () => ({ id: `al_${idSeq()}` })),
    deleteMany: vi.fn(async () => ({ count: 0 }))
  };

  const task = {
    create: vi.fn(async (args: any) => ({ id: `task_${idSeq()}`, title: args.data.title })),
    deleteMany: vi.fn(async () => ({ count: 0 }))
  };

  const taskSubtask = {
    create: vi.fn(async () => ({ id: `sub_${idSeq()}` }))
  };

  const taskAttachment = {
    create: vi.fn(async () => ({ id: `att_${idSeq()}` }))
  };

  const taskTicketLink = {
    create: vi.fn(async () => ({ id: `link_${idSeq()}` }))
  };

  const prisma: any = {
    tipo_Ticket,
    categoria_Ticket,
    user,
    operador,
    mesa_Trabalho,
    solicitante,
    whatsAppContact,
    funcionario,
    ticket,
    conversation,
    message,
    chatConversation,
    ticketEvent,
    auditLog,
    task,
    taskSubtask,
    taskAttachment,
    taskTicketLink
  };

  prisma.$transaction = vi.fn(async (fn: any) => fn(prisma));

  return prisma;
}

describe("prisma seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("popula dados conforme schema e retorna resumo", async () => {
    const prisma = createPrismaStub();

    const summary = await seedDatabase(prisma as any, {
      reset: false,
      seed: 1,
      verbose: false,
      counts: {
        solicitantes: 0,
        customersPerSolicitante: 1,
        agents: 1,
        ticketsPerSolicitante: 1,
        ticketEventsPerTicket: 1,
        conversations: 1,
        messagesPerConversation: 2,
        tasks: 2,
        subtasksPerTask: 1,
        attachmentsPerTask: 1,
        ticketLinksPerTask: 1
      }
    });

    expect(summary.users).toBe(5);
    expect(summary.agents).toBe(1);
    expect(summary.solicitantes).toBe(3);
    expect(summary.funcionarios).toBe(3);
    expect(summary.tickets).toBe(3);
    expect(summary.ticketEvents).toBe(7);
    expect(summary.conversations).toBe(1);
    expect(summary.messages).toBe(2);
    expect(summary.chatConversations).toBe(1);
    expect(summary.tasks).toBe(2);
    expect(summary.taskSubtasks).toBe(2);
    expect(summary.taskAttachments).toBe(2);
    expect(summary.taskTicketLinks).toBe(2);
    expect(summary.auditLogs).toBe(5);

    expect(prisma.ticket.create).toHaveBeenCalledTimes(3);
    const firstTicketData = (prisma.ticket.create as any).mock.calls[0]?.[0]?.data;
    expect(firstTicketData.solicitante_id).toBeTruthy();
  });
});
