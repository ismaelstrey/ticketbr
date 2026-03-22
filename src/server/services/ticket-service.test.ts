import { describe, expect, it, vi, beforeEach } from "vitest";

const findFirstSolicitanteMock = vi.fn();
const createTicketMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  Prisma: {},
  prisma: {
    solicitante: {
      findFirst: findFirstSolicitanteMock
    },
    ticket: {
      create: createTicketMock
    }
  }
}));

describe("ticket-service.createTicket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirstSolicitanteMock.mockResolvedValue(null);
    createTicketMock.mockResolvedValue({
      id: "t1",
      number: 1,
      company: "Tech Sol",
      requester: "Tech Sol",
      subject: "Assunto",
      description: null,
      status: "TODO",
      priority: "NONE",
      operator: null,
      contact: null,
      ticketType: null,
      category: null,
      workbench: null,
      responseSlaAt: null,
      solutionSlaAt: null,
      pausedReason: null,
      pauseSla: false,
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z"),
      events: []
    });
  });

  it("persiste solicitante_id quando solicitanteId é informado", async () => {
    const { createTicket } = await import("./ticket-service");

    await createTicket({
      empresa: "Tech Sol",
      solicitante: "Tech Sol",
      solicitanteId: "s1",
      assunto: "Assunto"
    } as any);

    expect(findFirstSolicitanteMock).toHaveBeenCalledTimes(0);
    const data = (createTicketMock.mock.calls[0]?.[0] as any)?.data;
    expect(data.solicitante_id).toBe("s1");
  });

  it("faz fallback por nome quando solicitanteId não é informado", async () => {
    findFirstSolicitanteMock.mockResolvedValueOnce({ id: "s2" });
    const { createTicket } = await import("./ticket-service");

    await createTicket({
      empresa: "Tech Sol",
      solicitante: "Tech Sol",
      assunto: "Assunto"
    } as any);

    expect(findFirstSolicitanteMock).toHaveBeenCalledTimes(1);
    const data = (createTicketMock.mock.calls[0]?.[0] as any)?.data;
    expect(data.solicitante_id).toBe("s2");
  });
});

