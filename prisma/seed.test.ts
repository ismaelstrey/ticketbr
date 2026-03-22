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

  const tipo_Ticket = {
    upsert: vi.fn(async (args: any) => ({ id: `tt_${args.where.nome}`, nome: args.where.nome }))
  };

  const categoria_Ticket = {
    upsert: vi.fn(async () => ({ id: `cat_${idSeq()}` })),
    findFirst: vi.fn(async (args: any) => ({ id: `cat_${args.where.nome}`, nome: args.where.nome }))
  };

  const user = {
    upsert: vi.fn(async (args: any) => ({
      id: `u_${args.where.email}`,
      email: args.where.email,
      name: args.create?.name ?? args.update?.name ?? "User",
      password: args.update?.password ?? args.create?.password ?? "pw",
      role: args.update?.role ?? args.create?.role ?? "AGENT"
    }))
  };

  const operador = {
    upsert: vi.fn(async () => ({ id: "op_admin", nome: "Administrador", email: "admin@ticketbr.com" }))
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
    findUnique: vi.fn(async () => ({ nome_fantasia: "Tech Sol", razao_social: "Tech Solutions" }))
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
    }))
  };

  const conversation = {
    upsert: vi.fn(async (args: any) => ({ id: `c_${args.where.waChatId}`, waChatId: args.where.waChatId }))
  };

  const message = {
    upsert: vi.fn(async () => ({ id: `m_${idSeq()}` }))
  };

  const chatConversation = {
    findFirst: vi.fn(async () => null),
    create: vi.fn(async () => ({ id: `cc_${idSeq()}` }))
  };

  const ticketEvent = {
    create: vi.fn(async () => ({ id: `te_${idSeq()}` }))
  };

  return {
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
    ticketEvent
  };
}

describe("prisma seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("popula dados conforme schema e retorna resumo", async () => {
    const prisma = createPrismaStub();

    const summary = await seedDatabase(prisma as any);

    expect(summary.users).toBe(4);
    expect(summary.solicitantes).toBe(3);
    expect(summary.funcionarios).toBe(3);
    expect(summary.tickets).toBe(6);
    expect(summary.conversations).toBe(3);
    expect(summary.messages).toBe(9);
    expect(summary.chatConversations).toBe(1);

    expect(prisma.ticket.create).toHaveBeenCalledTimes(6);
    const firstTicketData = (prisma.ticket.create as any).mock.calls[0]?.[0]?.data;
    expect(firstTicketData.solicitante_id).toBeTruthy();
  });
});

