import { describe, expect, it, vi, beforeEach } from "vitest";

const normalizeWhatsAppConfigMock = vi.fn();
const resolveWhatsAppConfigMock = vi.fn();
const syncWhatsAppContactsMock = vi.fn();
const isUazapiConfiguredMock = vi.fn();
const writeAuditLogMock = vi.fn();
const enforceAdminRouteSecurityMock = vi.fn();
const withRateLimitHeadersMock = vi.fn((response) => response);

vi.mock("@/server/services/whatsapp-settings", () => ({
  WHATSAPP_CONFIG_COOKIE: "ticketbr_whatsapp_config",
  decodeWhatsAppConfigCookie: vi.fn(() => null),
  getWhatsAppConfigFromDatabase: vi.fn(async () => null),
  normalizeWhatsAppConfig: normalizeWhatsAppConfigMock,
  resolveWhatsAppConfig: resolveWhatsAppConfigMock
}));

vi.mock("@/server/services/whatsapp-contacts", () => ({
  syncWhatsAppContacts: syncWhatsAppContactsMock
}));

vi.mock("@/server/services/uazapi-adapter", () => ({
  isUazapiConfigured: isUazapiConfiguredMock
}));

vi.mock("@/server/services/audit-log", () => ({
  writeAuditLog: writeAuditLogMock
}));

vi.mock("@/server/services/sensitive-route-guard", () => ({
  enforceAdminRouteSecurity: enforceAdminRouteSecurityMock,
  withRateLimitHeaders: withRateLimitHeadersMock
}));

describe("POST /api/settings/contacts/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeWhatsAppConfigMock.mockReturnValue({});
    resolveWhatsAppConfigMock.mockResolvedValue({});
    syncWhatsAppContactsMock.mockResolvedValue({ provider: "n8n", totalReceived: 0, totalSaved: 0 });
    isUazapiConfiguredMock.mockReturnValue(false);
    writeAuditLogMock.mockResolvedValue(undefined);
    enforceAdminRouteSecurityMock.mockResolvedValue({
      ok: true,
      actorUserId: "admin-1",
      rate: { allowed: true, retryAfterSeconds: 0, remaining: 29, limit: 30, resetAt: Date.now() + 60_000 }
    });
  });

  it("retorna 400 quando provider é uazapi mas não está configurado", async () => {
    const { POST } = await import("./route");

    const req = {
      json: async () => ({ whatsappProvider: "uazapi" }),
      cookies: { get: () => undefined }
    } as any;

    resolveWhatsAppConfigMock.mockResolvedValueOnce({ whatsappProvider: "uazapi" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(String(body.error)).toContain("UAZAPI");
    expect(syncWhatsAppContactsMock).toHaveBeenCalledTimes(0);
    expect(writeAuditLogMock).toHaveBeenCalledTimes(0);
  });

  it("executa sync quando provider não é uazapi", async () => {
    const { POST } = await import("./route");

    const req = {
      json: async () => ({ whatsappProvider: "n8n" }),
      cookies: { get: () => undefined }
    } as any;

    resolveWhatsAppConfigMock.mockResolvedValueOnce({ whatsappProvider: "n8n" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data?.provider).toBe("n8n");
    expect(syncWhatsAppContactsMock).toHaveBeenCalledTimes(1);
    expect(writeAuditLogMock).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "admin-1",
      action: "whatsapp_contacts_sync"
    }));
  });
});
