import { beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();
const clearMock = vi.fn();
const writeAuditLogMock = vi.fn();
const enforceAdminRouteSecurityMock = vi.fn();
const withRateLimitHeadersMock = vi.fn((response) => response);

vi.mock("@/server/services/webhook-request-logs", () => ({
  listWebhookRequestLogs: listMock,
  clearWebhookRequestLogs: clearMock
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock
}));

vi.mock("@/server/services/sensitive-route-guard", () => ({
  enforceAdminRouteSecurity: enforceAdminRouteSecurityMock,
  withRateLimitHeaders: withRateLimitHeadersMock
}));

// Monta um NextRequest mínimo com a query string informada
function makeRequest(query = "") {
  return { nextUrl: { searchParams: new URLSearchParams(query) } } as never;
}

describe("/api/settings/webhook-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMock.mockResolvedValue([]);
    clearMock.mockResolvedValue(0);
    writeAuditLogMock.mockResolvedValue(undefined);
    enforceAdminRouteSecurityMock.mockResolvedValue({
      ok: true,
      actorUserId: "admin-1",
      rate: { allowed: true, retryAfterSeconds: 0, remaining: 29, limit: 30, resetAt: Date.now() + 60_000 }
    });
  });

  it("retorna os logs aplicando os filtros da query", async () => {
    const { GET } = await import("./route");
    listMock.mockResolvedValueOnce([{ id: "log-1" }]);

    const res = await GET(makeRequest("limit=20&route=chat.webhook&ok=false"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual([{ id: "log-1" }]);
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, route: "chat.webhook", ok: false })
    );
  });

  it("não lista quando a autorização falha", async () => {
    const { GET } = await import("./route");
    enforceAdminRouteSecurityMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403 })
    });

    const res = await GET(makeRequest());

    expect(res.status).toBe(403);
    expect(listMock).not.toHaveBeenCalled();
  });

  it("limpa os logs e registra auditoria", async () => {
    const { DELETE } = await import("./route");
    clearMock.mockResolvedValueOnce(5);

    const res = await DELETE(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(clearMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "admin-1", action: "webhook_logs_clear" })
    );
  });
});
