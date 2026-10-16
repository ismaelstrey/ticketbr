import { beforeEach, describe, expect, it, vi } from "vitest";

const getPreferencesMock = vi.fn();
const savePreferencesMock = vi.fn();
const writeAuditLogMock = vi.fn();
const enforceAdminRouteSecurityMock = vi.fn();
const withRateLimitHeadersMock = vi.fn((response) => response);

vi.mock("@/server/services/notification-preferences", () => ({
  getNotificationPreferences: getPreferencesMock,
  saveNotificationPreferences: savePreferencesMock
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock
}));

vi.mock("@/server/services/sensitive-route-guard", () => ({
  enforceAdminRouteSecurity: enforceAdminRouteSecurityMock,
  withRateLimitHeaders: withRateLimitHeadersMock
}));

const preferencesFixture = {
  inAppEnabled: true,
  emailEnabled: false,
  types: {
    TICKET_STATUS_CHANGED: true,
    TICKET_COMMENT: false,
    TICKET_ASSIGNED: true,
    SLA_WARNING: true,
    SLA_BREACHED: true
  }
};

// Requisição mínima com o body informado
function makeRequest(body?: unknown) {
  return { json: async () => body } as never;
}

describe("/api/settings/notification-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPreferencesMock.mockResolvedValue(preferencesFixture);
    savePreferencesMock.mockResolvedValue(preferencesFixture);
    writeAuditLogMock.mockResolvedValue(undefined);
    enforceAdminRouteSecurityMock.mockResolvedValue({
      ok: true,
      actorUserId: "admin-1",
      rate: { allowed: true, retryAfterSeconds: 0, remaining: 29, limit: 30, resetAt: Date.now() + 60_000 }
    });
  });

  it("retorna as preferências salvas", async () => {
    const { GET } = await import("./route");

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(preferencesFixture);
    expect(getPreferencesMock).toHaveBeenCalledTimes(1);
  });

  it("não responde quando a autorização falha", async () => {
    const { GET } = await import("./route");
    enforceAdminRouteSecurityMock.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403 })
    });

    const res = await GET(makeRequest());

    expect(res.status).toBe(403);
    expect(getPreferencesMock).not.toHaveBeenCalled();
  });

  it("salva as preferências e registra auditoria com os tipos desabilitados", async () => {
    const { POST } = await import("./route");

    const res = await POST(makeRequest({ emailEnabled: false }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual(preferencesFixture);
    expect(savePreferencesMock).toHaveBeenCalledWith({ emailEnabled: false });
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "admin-1",
        action: "notification_preferences_update",
        metadata: expect.objectContaining({ emailEnabled: false, disabledTypes: ["TICKET_COMMENT"] })
      })
    );
  });

  it("retorna 400 quando o corpo da requisição é inválido", async () => {
    const { POST } = await import("./route");

    const res = await POST(makeRequest(null));

    expect(res.status).toBe(400);
    expect(savePreferencesMock).not.toHaveBeenCalled();
  });
});
