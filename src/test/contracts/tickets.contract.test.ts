import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnvelopeWithErrorSchema, TicketCreateResponseSchema, TicketListResponseSchema } from "./schemas";

const listTicketsMock = vi.fn();
const createTicketMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@/server/services/ticket-service", () => ({
  listTickets: listTicketsMock,
  createTicket: createTicketMock,
}));

vi.mock("@/lib/auth", () => ({
  getSession: getSessionMock,
}));

describe("API Contract - /api/tickets", () => {
  beforeEach(() => {
    vi.resetModules();
    listTicketsMock.mockReset();
    createTicketMock.mockReset();
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ id: "u1", name: "Operator" });
  });

  it("GET returns stable success envelope", async () => {
    listTicketsMock.mockResolvedValueOnce([{ id: "t1", subject: "Issue" }]);
    const { GET } = await import("@/app/api/tickets/route");

    const res = await GET({} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(TicketListResponseSchema.safeParse(body).success).toBe(true);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("POST returns stable create envelope", async () => {
    createTicketMock.mockResolvedValueOnce({ id: "t1", subject: "Issue" });
    const { POST } = await import("@/app/api/tickets/route");

    const req = new Request("http://localhost/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        empresa: "ACME",
        solicitante: "Cliente X",
        assunto: "Falha em login",
        descricao: "Usuario sem acesso",
        categoria: "Acesso",
        tipoTicket: "SUPORTE",
        prioridade: "Alta",
      }),
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(TicketCreateResponseSchema.safeParse(body).success).toBe(true);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("POST returns validation error contract on invalid payload", async () => {
    const { POST } = await import("@/app/api/tickets/route");
    const req = new Request("http://localhost/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(EnvelopeWithErrorSchema.safeParse(body).success).toBe(true);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});
