import { describe, expect, it, vi, beforeEach } from "vitest";

const findFirstSolicitanteMock = vi.fn();
const createTicketMock = vi.fn();
const findUniqueTicketMock = vi.fn();
const updateTicketMock = vi.fn();
const createEventMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      meta?: any;
      constructor(message: string, code = "P2022", meta?: any) {
        super(message);
        this.code = code;
        this.meta = meta;
      }
    }
  },
  prisma: {
    solicitante: {
      findFirst: findFirstSolicitanteMock
    },
    ticket: {
      create: createTicketMock,
      findUnique: findUniqueTicketMock,
      update: updateTicketMock
    },
    ticketEvent: {
      create: createEventMock
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

describe("ticket-service.changeTicketStatus (compat)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("faz fallback quando DB não tem colunas pauseSla/pausedStartedAt/pausedTotalSeconds", async () => {
    const missingColumnsError = new Error("P2022 Column pauseSla does not exist");

    findUniqueTicketMock.mockRejectedValueOnce(missingColumnsError);
    const ticketRow = {
      id: "t1",
      number: 1,
      company: "Acme",
      requester: "Acme",
      subject: "Teste",
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
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z"),
      events: []
    };

    findUniqueTicketMock.mockResolvedValueOnce(ticketRow);
    findUniqueTicketMock.mockResolvedValue(ticketRow);

    updateTicketMock.mockRejectedValueOnce(missingColumnsError);
    updateTicketMock.mockResolvedValueOnce({ id: "t1" });

    createEventMock.mockResolvedValueOnce({ id: "e1" });

    const { changeTicketStatus } = await import("./ticket-service");
    const result = await changeTicketStatus("t1", "doing" as any, "Admin");

    expect(updateTicketMock).toHaveBeenCalledTimes(2);
    const secondData = (updateTicketMock.mock.calls[1]?.[0] as any)?.data;
    expect(secondData).toEqual({ status: "DOING", pausedReason: null });
    expect(createEventMock).toHaveBeenCalledTimes(1);
    expect(result).toBeTruthy();
  });
});
