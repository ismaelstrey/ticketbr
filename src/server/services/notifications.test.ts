import { beforeEach, describe, expect, it, vi } from "vitest";

const notificationCreateMock = vi.fn();
const notificationFindManyMock = vi.fn();
const notificationCountMock = vi.fn();
const notificationUpdateManyMock = vi.fn();
const userFindManyMock = vi.fn();
const userFindFirstMock = vi.fn();
const solicitanteFindUniqueMock = vi.fn();
const funcionarioFindManyMock = vi.fn();
const ticketFindUniqueMock = vi.fn();
const ticketFindManyMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, code = "P2002") {
        super(message);
        this.code = code;
      }
    }
  },
  prisma: {
    notification: {
      create: notificationCreateMock,
      findMany: notificationFindManyMock,
      count: notificationCountMock,
      updateMany: notificationUpdateManyMock
    },
    user: {
      findMany: userFindManyMock,
      findFirst: userFindFirstMock
    },
    solicitante: {
      findUnique: solicitanteFindUniqueMock
    },
    funcionario: {
      findMany: funcionarioFindManyMock
    },
    ticket: {
      findUnique: ticketFindUniqueMock,
      findMany: ticketFindManyMock
    }
  }
}));

vi.mock("@/server/services/emailer", () => ({
  sendEmail: sendEmailMock
}));

describe("notifications service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationCreateMock.mockResolvedValue({ id: "n1" });
    notificationFindManyMock.mockResolvedValue([]);
    notificationCountMock.mockResolvedValue(0);
    notificationUpdateManyMock.mockResolvedValue({ count: 0 });
    userFindManyMock.mockResolvedValue([]);
    userFindFirstMock.mockResolvedValue(null);
    solicitanteFindUniqueMock.mockResolvedValue(null);
    funcionarioFindManyMock.mockResolvedValue([]);
    ticketFindUniqueMock.mockResolvedValue(null);
    ticketFindManyMock.mockResolvedValue([]);
    sendEmailMock.mockResolvedValue(undefined);
  });

  it("cria notificação in-app por destinatário e envia email", async () => {
    const { dispatchNotification } = await import("./notifications");

    const result = await dispatchNotification({
      tipo: "TICKET_COMMENT",
      title: "Novo comentário",
      recipients: [{ userId: "u1" }, { userId: "u2", email: "u2@a.com" }],
      email: { subject: "Assunto", text: "Texto" }
    });

    expect(result.created).toBe(2);
    expect(notificationCreateMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].to).toEqual(["u2@a.com"]);
  });

  it("ignora duplicatas (P2002) de dedupeKey sem lançar", async () => {
    const { Prisma } = await import("@/lib/prisma");
    notificationCreateMock.mockRejectedValueOnce(
      new (Prisma.PrismaClientKnownRequestError as any)("duplicado", "P2002")
    );

    const { dispatchNotification } = await import("./notifications");
    const result = await dispatchNotification({
      tipo: "SLA_WARNING",
      title: "SLA próximo",
      dedupeKey: "sla_warning:t1:response",
      recipients: [{ userId: "u1" }]
    });

    expect(result.created).toBe(0);
    expect(result.emailed).toBe(0);
  });

  it("lista notificações com contagem de não lidas respeitando o limite", async () => {
    notificationFindManyMock.mockResolvedValueOnce([{ id: "n1", title: "Aviso" }]);
    notificationCountMock.mockResolvedValueOnce(3);

    const { listNotifications } = await import("./notifications");
    const result = await listNotifications("u1", { limit: 500 });

    expect(result.items).toHaveLength(1);
    expect(result.unreadCount).toBe(3);
    expect(notificationFindManyMock.mock.calls[0][0].take).toBe(100);
  });

  it("marca todas as notificações não lidas quando all é informado", async () => {
    notificationUpdateManyMock.mockResolvedValueOnce({ count: 4 });

    const { markNotificationsRead } = await import("./notifications");
    const result = await markNotificationsRead("u1", { all: true });

    expect(result.updated).toBe(4);
    expect(notificationUpdateManyMock.mock.calls[0][0].where).toEqual({ userId: "u1", readAt: null });
  });

  it("varre SLA e classifica tickets estourados e próximos do vencimento", async () => {
    const deadlinePast = new Date("2026-01-01T00:00:00.000Z");
    const deadlineSoon = new Date("2026-01-01T02:00:00.000Z");
    ticketFindManyMock.mockResolvedValueOnce([
      {
        id: "t1",
        number: 1,
        subject: "Sem resposta",
        solicitante_id: "s1",
        responseSlaAt: deadlinePast,
        solutionSlaAt: null,
        operador_rel: null
      },
      {
        id: "t2",
        number: 2,
        subject: "Quase vencendo",
        solicitante_id: "s1",
        responseSlaAt: deadlineSoon,
        solutionSlaAt: null,
        operador_rel: null
      }
    ]);
    userFindManyMock.mockResolvedValue([{ id: "admin1", email: "admin@a.com" }]);

    const { runSlaScan } = await import("./notifications");
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = await runSlaScan(now, 4);

    expect(result.scanned).toBe(2);
    expect(result.breached).toBe(1);
    expect(result.warnings).toBe(1);
    expect(notificationCreateMock).toHaveBeenCalledTimes(2);
    expect(notificationCreateMock.mock.calls[0][0].data.dedupeKey).toBe("sla_breached:t1:response:admin1");
  });

  it("resolve a audiência do cliente com membros e email do solicitante", async () => {
    solicitanteFindUniqueMock.mockResolvedValueOnce({ email: "empresa@a.com" });
    funcionarioFindManyMock.mockResolvedValueOnce([
      { userId: "u1", email: null, user: { email: "membro@a.com" } }
    ]);

    const { resolveCustomerAudience } = await import("./notifications");
    const audience = await resolveCustomerAudience("s1");

    expect(audience.userIds).toEqual(["u1"]);
    expect(audience.emails).toEqual(["empresa@a.com", "membro@a.com"]);
  });
});
