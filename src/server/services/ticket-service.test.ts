import { describe, expect, it, vi, beforeEach } from "vitest";

const findFirstSolicitanteMock = vi.fn();
const findUniqueSolicitanteMock = vi.fn();
const findFirstTipoTicketMock = vi.fn();
const findUniqueTipoTicketMock = vi.fn();
const findFirstCategoriaMock = vi.fn();
const findFirstMesaMock = vi.fn();
const findFirstOperadorMock = vi.fn();
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
      findFirst: findFirstSolicitanteMock,
      findUnique: findUniqueSolicitanteMock
    },
    tipo_Ticket: {
      findFirst: findFirstTipoTicketMock,
      findUnique: findUniqueTipoTicketMock
    },
    categoria_Ticket: {
      findFirst: findFirstCategoriaMock
    },
    mesa_Trabalho: {
      findFirst: findFirstMesaMock
    },
    operador: {
      findFirst: findFirstOperadorMock
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
    findUniqueSolicitanteMock.mockResolvedValue(null);
    findFirstTipoTicketMock.mockResolvedValue(null);
    findUniqueTipoTicketMock.mockResolvedValue(null);
    findFirstCategoriaMock.mockResolvedValue(null);
    findFirstMesaMock.mockResolvedValue(null);
    findFirstOperadorMock.mockResolvedValue(null);
    createTicketMock.mockResolvedValue({
      id: "t1",
      number: 1,
      subject: "Assunto",
      description: null,
      status: "TODO",
      priority: "NONE",
      contact: null,
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

  it("persiste os relacionamentos resolvidos a partir dos nomes informados", async () => {
    findFirstTipoTicketMock.mockResolvedValueOnce({ id: "tt1" });
    findFirstCategoriaMock.mockResolvedValueOnce({ id: "cat1" });
    findFirstMesaMock.mockResolvedValueOnce({ id: "mesa1" });
    findFirstOperadorMock.mockResolvedValueOnce({ id: "op1" });

    const { createTicket } = await import("./ticket-service");
    await createTicket({
      empresa: "Tech Sol",
      solicitante: "Tech Sol",
      assunto: "Assunto",
      tipoTicket: "Rede",
      categoria: "Cabeamento",
      mesaTrabalho: "Mesa 1",
      operador: "Joao"
    } as any);

    const data = (createTicketMock.mock.calls[0]?.[0] as any)?.data;
    expect(data.tipo_ticket_id).toBe("tt1");
    expect(data.categoria_id).toBe("cat1");
    expect(data.mesa_trabalho_id).toBe("mesa1");
    expect(data.operador_id).toBe("op1");
  });
});

describe("ticket-service.getTicketById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mapeia os nomes de empresa, tipo, categoria, mesa e operador a partir dos relacionamentos", async () => {
    findUniqueTicketMock.mockResolvedValueOnce({
      id: "t1",
      number: 1,
      subject: "Assunto",
      description: null,
      status: "TODO",
      priority: "NONE",
      contact: null,
      responseSlaAt: null,
      solutionSlaAt: null,
      pausedReason: null,
      pauseSla: false,
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z"),
      events: [],
      solicitante: { id: "s1", nome_fantasia: "Cliente Novo", razao_social: null },
      tipo_ticket: { id: "tt1", nome: "Rede", sla_horas: 4 },
      categoria: { id: "c1", nome: "Cabeamento" },
      mesa_trabalho_rel: { id: "m1", nome: "Mesa 1" },
      operador_rel: { id: "o1", nome: "Joao" }
    });

    const { getTicketById } = await import("./ticket-service");
    const ticket = await getTicketById("t1");

    expect(ticket?.empresa).toBe("Cliente Novo");
    expect(ticket?.solicitante).toBe("Cliente Novo");
    expect(ticket?.tipoTicket).toBe("Rede");
    expect(ticket?.categoria).toBe("Cabeamento");
    expect(ticket?.mesaTrabalho).toBe("Mesa 1");
    expect(ticket?.operador).toBe("Joao");
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
      subject: "Teste",
      description: null,
      status: "TODO",
      priority: "NONE",
      contact: null,
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

  it("rejeita transição inválida (DONE -> PAUSED) sem persistir", async () => {
    const ticketRow = {
      id: "t1",
      number: 1,
      subject: "Teste",
      description: null,
      status: "DONE",
      priority: "NONE",
      contact: null,
      responseSlaAt: null,
      solutionSlaAt: null,
      pausedReason: null,
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z"),
      events: []
    };

    findUniqueTicketMock.mockResolvedValue(ticketRow);

    const { changeTicketStatus } = await import("./ticket-service");

    await expect(changeTicketStatus("t1", "paused" as any, "Admin", "Aguardando cliente")).rejects.toThrow(
      "Transição de status inválida"
    );
    expect(updateTicketMock).not.toHaveBeenCalled();
    expect(createEventMock).not.toHaveBeenCalled();
  });

  it("não gera evento quando o status informado é o mesmo (idempotente)", async () => {
    const ticketRow = {
      id: "t1",
      number: 1,
      subject: "Teste",
      description: null,
      status: "DOING",
      priority: "NONE",
      contact: null,
      responseSlaAt: null,
      solutionSlaAt: null,
      pausedReason: null,
      createdAt: new Date("2026-03-22T00:00:00.000Z"),
      updatedAt: new Date("2026-03-22T00:00:00.000Z"),
      events: []
    };

    findUniqueTicketMock.mockResolvedValue(ticketRow);

    const { changeTicketStatus } = await import("./ticket-service");
    const result = await changeTicketStatus("t1", "doing" as any, "Admin");

    expect(result).toBeTruthy();
    expect(updateTicketMock).not.toHaveBeenCalled();
    expect(createEventMock).not.toHaveBeenCalled();
  });
});
