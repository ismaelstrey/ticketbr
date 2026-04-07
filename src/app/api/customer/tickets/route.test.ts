import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCustomerContextMock = vi.fn();
const writeAuditLogMock = vi.fn();
const notifyTicketCreatedMock = vi.fn();

const ticketFindManyMock = vi.fn();
const ticketCreateMock = vi.fn();
const categoriaFindUniqueMock = vi.fn();

vi.mock("@/server/services/customer-context", () => ({
  requireCustomerContext: requireCustomerContextMock
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock
}));

vi.mock("@/server/services/customer-notifications", () => ({
  notifyTicketCreated: notifyTicketCreatedMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findMany: ticketFindManyMock,
      create: ticketCreateMock
    },
    categoria_Ticket: {
      findUnique: categoriaFindUniqueMock
    }
  }
}));

describe("/api/customer/tickets", () => {
  beforeEach(() => {
    vi.resetModules();
    requireCustomerContextMock.mockReset();
    writeAuditLogMock.mockReset();
    notifyTicketCreatedMock.mockReset();
    ticketFindManyMock.mockReset();
    ticketCreateMock.mockReset();
    categoriaFindUniqueMock.mockReset();
  });

  it("GET lista apenas tickets da empresa do cliente", async () => {
    requireCustomerContextMock.mockResolvedValue({
      user: { id: "u1", email: "c@a.com", name: "Cliente", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "ACME", razao_social: "ACME", email: "acme@a.com" },
      member: { id: "m1", solicitante_id: "s1", isAdmin: false }
    });

    ticketFindManyMock.mockResolvedValueOnce([
      {
        id: "t1",
        number: 10,
        subject: "Teste",
        description: "Desc",
        status: "TODO",
        priority: "NONE",
        createdAt: new Date("2026-04-01T10:00:00.000Z"),
        updatedAt: new Date("2026-04-01T11:00:00.000Z"),
        categoria: { id: "c1", nome: "Suporte" }
      }
    ]);

    const { GET } = await import("./route");
    const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(ticketFindManyMock).toHaveBeenCalledTimes(1);
    expect(ticketFindManyMock.mock.calls[0][0].where.solicitante_id).toBe("s1");
  }, 15_000);

  it("POST retorna 400 quando categoria é inválida", async () => {
    requireCustomerContextMock.mockResolvedValue({
      user: { id: "u1", email: "c@a.com", name: "Cliente", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "ACME", razao_social: "ACME", email: "acme@a.com" },
      member: { id: "m1", solicitante_id: "s1", isAdmin: false }
    });
    categoriaFindUniqueMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const req = {
      json: async () => ({ subject: "Teste", description: "Desc", categoriaId: "x", priority: "NONE" })
    } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("POST cria ticket e chama auditoria e notificação", async () => {
    requireCustomerContextMock.mockResolvedValue({
      user: { id: "u1", email: "c@a.com", name: "Cliente", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "ACME", razao_social: "ACME", email: "acme@a.com" },
      member: { id: "m1", solicitante_id: "s1", isAdmin: false }
    });
    categoriaFindUniqueMock.mockResolvedValueOnce({ id: "c1", nome: "Suporte", tipo_ticket_id: "tt1" });
    ticketCreateMock.mockResolvedValueOnce({ id: "t1", number: 10, subject: "Teste" });

    const { POST } = await import("./route");
    const req = {
      json: async () => ({ subject: "Teste", description: "Desc", categoriaId: "c1", priority: "NONE" })
    } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe("t1");
    expect(writeAuditLogMock).toHaveBeenCalledTimes(1);
    expect(notifyTicketCreatedMock).toHaveBeenCalledTimes(1);
  });
});
