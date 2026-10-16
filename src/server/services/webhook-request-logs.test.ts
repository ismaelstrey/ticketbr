import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const createMock = vi.fn();
const findManyMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  Prisma: { JsonNull: null },
  prisma: {
    webhookRequestLog: {
      create: createMock,
      findMany: findManyMock,
      deleteMany: deleteManyMock
    }
  }
}));

// Monta um NextRequest mínimo com os headers informados
function makeRequest(headers: Record<string, string> = {}, pathname = "/api/chat/webhook") {
  return {
    method: "POST",
    nextUrl: { pathname },
    headers: { get: (key: string) => headers[key.toLowerCase()] ?? null }
  } as unknown as NextRequest;
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "log-1",
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
    method: "POST",
    path: "/api/chat/webhook",
    route: "chat.webhook",
    source: "uazapi",
    status: 200,
    ok: true,
    ip: "203.0.113.9",
    userAgent: "uazapi-bot",
    payload: { a: 1 },
    headers: { "content-type": "application/json" },
    ...overrides
  };
}

describe("webhook-request-logs service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMock.mockResolvedValue([]);
    deleteManyMock.mockResolvedValue({ count: 0 });
  });

  it("persiste a requisição e retorna a entrada mapeada", async () => {
    const { logWebhookRequest } = await import("./webhook-request-logs");
    createMock.mockResolvedValueOnce(row());

    const entry = await logWebhookRequest({
      request: makeRequest({ "x-forwarded-for": "203.0.113.9", "user-agent": "uazapi-bot" }),
      payload: { a: 1 },
      route: "chat.webhook",
      source: "uazapi",
      status: 200
    });

    expect(entry?.createdAt).toBe("2026-05-01T10:00:00.000Z");
    expect(entry?.ok).toBe(true);
    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        method: "POST",
        path: "/api/chat/webhook",
        route: "chat.webhook",
        source: "uazapi",
        status: 200,
        ok: true,
        ip: "203.0.113.9",
        userAgent: "uazapi-bot"
      })
    });
  });

  it("trunca o user-agent longo e marca ok=false em status de erro", async () => {
    const { logWebhookRequest } = await import("./webhook-request-logs");
    const longUserAgent = "u".repeat(400);
    createMock.mockResolvedValueOnce(row({ status: 500, ok: false, userAgent: longUserAgent.slice(0, 255) }));

    await logWebhookRequest({
      request: makeRequest({ "user-agent": longUserAgent }),
      payload: null,
      route: "chat.inbound",
      status: 500
    });

    const data = createMock.mock.calls[0][0].data;
    expect(data.userAgent.length).toBe(255);
    expect(data.ok).toBe(false);
  });

  it("remove do banco os registros excedentes após inserir", async () => {
    const { logWebhookRequest } = await import("./webhook-request-logs");
    createMock.mockResolvedValueOnce(row());
    findManyMock.mockResolvedValueOnce([{ id: "old-1" }, { id: "old-2" }]);
    deleteManyMock.mockResolvedValueOnce({ count: 2 });

    await logWebhookRequest({
      request: makeRequest(),
      payload: {},
      route: "chat.webhook",
      status: 200
    });

    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: { in: ["old-1", "old-2"] } } });
  });

  it("não lança e retorna null quando a persistência falha", async () => {
    const { logWebhookRequest } = await import("./webhook-request-logs");
    createMock.mockRejectedValueOnce(new Error("db down"));

    const entry = await logWebhookRequest({
      request: makeRequest(),
      payload: {},
      route: "chat.webhook",
      status: 200
    });

    expect(entry).toBeNull();
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("lista os logs aplicando filtros e limite", async () => {
    const { listWebhookRequestLogs } = await import("./webhook-request-logs");
    findManyMock.mockResolvedValueOnce([row({ status: 500, ok: false })]);

    const logs = await listWebhookRequestLogs({ status: 500, route: "chat.inbound", limit: 10 });

    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe("log-1");
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { route: "chat.inbound", status: 500 },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    );
  });

  it("limpa os logs e retorna a quantidade removida", async () => {
    const { clearWebhookRequestLogs } = await import("./webhook-request-logs");
    deleteManyMock.mockResolvedValueOnce({ count: 7 });

    await expect(clearWebhookRequestLogs()).resolves.toBe(7);
    expect(deleteManyMock).toHaveBeenCalledWith({});
  });
});
