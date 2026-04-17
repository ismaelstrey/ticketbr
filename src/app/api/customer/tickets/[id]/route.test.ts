import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCustomerContextMock = vi.fn();
const ticketFindFirstMock = vi.fn();

vi.mock("@/server/services/customer-context", () => ({
  requireCustomerContext: requireCustomerContextMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findFirst: ticketFindFirstMock
    }
  }
}));

describe("/api/customer/tickets/[id]", () => {
  beforeEach(() => {
    vi.resetModules();
    requireCustomerContextMock.mockReset();
    ticketFindFirstMock.mockReset();
  });

  it("GET retorna portalStatus e comentários filtrados", async () => {
    requireCustomerContextMock.mockResolvedValue({
      user: { id: "u1", email: "c@a.com", name: "Cliente", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "ACME", razao_social: "ACME", email: "acme@a.com" },
      member: { id: "m1", solicitante_id: "s1", isAdmin: false }
    });

    ticketFindFirstMock.mockResolvedValueOnce({
      id: "t1",
      number: 123,
      subject: "Login indisponível",
      description: "Não consigo autenticar",
      status: "DOING",
      priority: "MEDIUM",
      createdAt: new Date("2026-04-10T10:00:00.000Z"),
      updatedAt: new Date("2026-04-10T11:00:00.000Z"),
      categoria: { id: "c1", nome: "Suporte" },
      events: [
        { id: "e1", type: "CREATED", author: "Sistema", authorId: null, description: "Criado", createdAt: new Date("2026-04-10T10:00:00.000Z") },
        { id: "e2", type: "COMMENT", author: "Cliente", authorId: "u1", description: "Pode verificar?", createdAt: new Date("2026-04-10T10:30:00.000Z") }
      ]
    });

    const { GET } = await import("./route");
    const req = {} as any;
    const res = await GET(req, { params: Promise.resolve({ id: "t1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("t1");
    expect(body.data.portalStatusKey).toBe("IN_PROGRESS");
    expect(body.data.portalStatus?.label).toBe("Em atendimento");
    expect(body.data.comments).toHaveLength(1);
    expect(body.data.comments[0].message).toBe("Pode verificar?");
  });

  it("GET retorna 404 quando ticket não existe", async () => {
    requireCustomerContextMock.mockResolvedValue({
      user: { id: "u1", email: "c@a.com", name: "Cliente", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "ACME", razao_social: "ACME", email: "acme@a.com" },
      member: { id: "m1", solicitante_id: "s1", isAdmin: false }
    });
    ticketFindFirstMock.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const req = {} as any;
    const res = await GET(req, { params: Promise.resolve({ id: "missing" }) });

    expect(res.status).toBe(404);
  });
});

