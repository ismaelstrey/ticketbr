import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CustomerTicketCreateResponseSchema,
  CustomerTicketListResponseSchema,
  EnvelopeWithErrorSchema,
} from "./schemas";

const requireCustomerContextMock = vi.fn();
const writeAuditLogMock = vi.fn();
const notifyTicketCreatedMock = vi.fn();
const ticketFindManyMock = vi.fn();
const ticketCreateMock = vi.fn();
const categoriaFindUniqueMock = vi.fn();

vi.mock("@/server/services/customer-context", () => ({
  requireCustomerContext: requireCustomerContextMock,
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock,
}));

vi.mock("@/server/services/customer-notifications", () => ({
  notifyTicketCreated: notifyTicketCreatedMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findMany: ticketFindManyMock,
      create: ticketCreateMock,
    },
    categoria_Ticket: {
      findUnique: categoriaFindUniqueMock,
    },
  },
}));

describe("API Contract - /api/customer/tickets", () => {
  beforeEach(() => {
    vi.resetModules();
    requireCustomerContextMock.mockReset();
    writeAuditLogMock.mockReset();
    notifyTicketCreatedMock.mockReset();
    ticketFindManyMock.mockReset();
    ticketCreateMock.mockReset();
    categoriaFindUniqueMock.mockReset();

    requireCustomerContextMock.mockResolvedValue({
      user: { id: "u1", email: "c@a.com", name: "Cliente", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "ACME", razao_social: "ACME", email: "acme@a.com" },
      member: { id: "m1", solicitante_id: "s1", isAdmin: false },
    });
  });

  it("GET returns list contract", async () => {
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
        categoria: { id: "c1", nome: "Suporte" },
      },
    ]);

    const { GET } = await import("@/app/api/customer/tickets/route");
    const req = { nextUrl: { searchParams: new URLSearchParams() } } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(CustomerTicketListResponseSchema.safeParse(body).success).toBe(true);
  });

  it("POST returns create contract", async () => {
    categoriaFindUniqueMock.mockResolvedValueOnce({ id: "c1", nome: "Suporte", tipo_ticket_id: "tt1" });
    ticketCreateMock.mockResolvedValueOnce({ id: "t1", number: 10, subject: "Teste" });

    const { POST } = await import("@/app/api/customer/tickets/route");
    const req = {
      json: async () => ({ subject: "Teste", description: "Desc", categoriaId: "c1", priority: "NONE" }),
    } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(CustomerTicketCreateResponseSchema.safeParse(body).success).toBe(true);
  });

  it("POST returns category validation error contract", async () => {
    categoriaFindUniqueMock.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/customer/tickets/route");
    const req = {
      json: async () => ({ subject: "Teste", description: "Desc", categoriaId: "x", priority: "NONE" }),
    } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(EnvelopeWithErrorSchema.safeParse(body).success).toBe(true);
  });
});
