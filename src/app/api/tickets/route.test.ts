import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("/api/tickets", () => {
  beforeEach(() => {
    vi.resetModules();
    listTicketsMock.mockReset();
    createTicketMock.mockReset();
    getSessionMock.mockReset();
  });

  it("GET retorna tickets com requestId e header de correlacao", async () => {
    listTicketsMock.mockResolvedValueOnce([{ id: "t1", titulo: "Chamado" }]);
    const { GET } = await import("./route");

    const res = await GET({} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(typeof body.requestId).toBe("string");
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST retorna 400 para payload invalido com requestId padronizado", async () => {
    const { POST } = await import("./route");

    const req = {
      json: async () => ({}),
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(typeof body.requestId).toBe("string");
    expect(typeof body.error).toBe("string");
    expect(createTicketMock).not.toHaveBeenCalled();
  });

  it("POST cria ticket com operador da sessao e retorna 201", async () => {
    getSessionMock.mockResolvedValueOnce({ name: "Agente Teste" });
    createTicketMock.mockResolvedValueOnce({ id: "t2" });
    const { POST } = await import("./route");

    const req = {
      json: async () => ({
        empresa: "Empresa X",
        solicitante: "Cliente Y",
        assunto: "Novo ticket",
        descricao: "Descricao",
        categoria: "Duvida",
        status: "todo",
      }),
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(typeof body.requestId).toBe("string");
    expect(createTicketMock).toHaveBeenCalledTimes(1);
    expect(createTicketMock.mock.calls[0][0].operador).toBe("Agente Teste");
  });
});
