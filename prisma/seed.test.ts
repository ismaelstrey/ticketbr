import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { seedDatabase } from "./seed";

// Stub mínimo do Prisma cobrindo apenas os modelos usados pelo bootstrap
function createPrismaStub() {
  const tipo_Ticket = {
    upsert: vi.fn(async (args: any) => ({ id: `tt_${args.where.nome}`, nome: args.where.nome }))
  };

  const categoria_Ticket = {
    upsert: vi.fn(async (args: any) => ({ id: `cat_${args.create.nome}`, nome: args.create.nome }))
  };

  const user = {
    upsert: vi.fn(async (args: any) => ({
      id: `u_${args.where.email}`,
      email: args.where.email,
      name: args.create?.name ?? args.update?.name ?? "Admin",
      role: args.update?.role ?? args.create?.role ?? "AGENT"
    }))
  };

  const operador = {
    upsert: vi.fn(async (args: any) => ({ id: `op_${args.where.email}`, email: args.where.email }))
  };

  const mesa_Trabalho = {
    upsert: vi.fn(async (args: any) => ({ id: args.where.id }))
  };

  return { tipo_Ticket, categoria_Ticket, user, operador, mesa_Trabalho } as any;
}

describe("prisma seed (bootstrap de produção)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_PASSWORD = "senha-de-teste-123";
    process.env.ADMIN_EMAIL = "admin@ticketbr.com";
  });

  afterEach(() => {
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_EMAIL;
  });

  it("cria apenas o acesso administrativo e as configurações essenciais", async () => {
    const prisma = createPrismaStub();

    const summary = await seedDatabase(prisma);

    expect(summary.adminEmail).toBe("admin@ticketbr.com");
    expect(summary.ticketTypes).toBe(4);
    expect(summary.ticketCategories).toBe(14);
    expect(summary.mesaTrabalho).toBe("mesa-n1-default");

    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
    const userArgs = prisma.user.upsert.mock.calls[0][0];
    expect(userArgs.where.email).toBe("admin@ticketbr.com");
    expect(userArgs.create.role).toBe("ADMIN");
    // A senha é gravada apenas na criação, nunca em texto puro e nunca sobrescrita
    expect(userArgs.create.password).not.toBe("senha-de-teste-123");
    expect(userArgs.update.password).toBeUndefined();

    expect(prisma.operador.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.tipo_Ticket.upsert).toHaveBeenCalledTimes(4);
    expect(prisma.categoria_Ticket.upsert).toHaveBeenCalledTimes(14);
    expect(prisma.mesa_Trabalho.upsert).toHaveBeenCalledTimes(1);
  });

  it("não cria dados fictícios (tickets, clientes, conversas ou tasks)", async () => {
    const prisma = createPrismaStub();

    await seedDatabase(prisma);

    expect(prisma.ticket).toBeUndefined();
    expect(prisma.solicitante).toBeUndefined();
    expect(prisma.conversation).toBeUndefined();
    expect(prisma.task).toBeUndefined();
    expect(prisma.whatsAppContact).toBeUndefined();
    expect(prisma.funcionario).toBeUndefined();
  });

  it("exige ADMIN_PASSWORD definido", async () => {
    delete process.env.ADMIN_PASSWORD;
    const prisma = createPrismaStub();

    await expect(seedDatabase(prisma)).rejects.toThrow(/ADMIN_PASSWORD/);
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it("rejeita ADMIN_PASSWORD com menos de 8 caracteres", async () => {
    process.env.ADMIN_PASSWORD = "curta";
    const prisma = createPrismaStub();

    await expect(seedDatabase(prisma)).rejects.toThrow(/8 caracteres/);
  });
});
