import { describe, expect, it, vi, beforeEach } from "vitest";

const normalizeWhatsAppConfigMock = vi.fn();
const resolveWhatsAppConfigMock = vi.fn();
const syncWhatsAppContactsMock = vi.fn();
const isUazapiConfiguredMock = vi.fn();

vi.mock("@/server/services/whatsapp-settings", () => ({
  normalizeWhatsAppConfig: normalizeWhatsAppConfigMock,
  resolveWhatsAppConfig: resolveWhatsAppConfigMock
}));

vi.mock("@/server/services/whatsapp-contacts", () => ({
  syncWhatsAppContacts: syncWhatsAppContactsMock
}));

vi.mock("@/server/services/uazapi-adapter", () => ({
  isUazapiConfigured: isUazapiConfiguredMock
}));

describe("POST /api/settings/contacts/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeWhatsAppConfigMock.mockReturnValue({});
    resolveWhatsAppConfigMock.mockResolvedValue({});
    syncWhatsAppContactsMock.mockResolvedValue({ provider: "n8n", totalReceived: 0, totalSaved: 0 });
    isUazapiConfiguredMock.mockReturnValue(false);
  });

  it("retorna 400 quando provider é uazapi mas não está configurado", async () => {
    const { POST } = await import("./route");

    const req = {
      json: async () => ({ whatsappProvider: "uazapi" })
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(String(body.error)).toContain("UAZAPI");
    expect(syncWhatsAppContactsMock).toHaveBeenCalledTimes(0);
  });

  it("executa sync quando provider não é uazapi", async () => {
    const { POST } = await import("./route");

    const req = {
      json: async () => ({ whatsappProvider: "n8n" })
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data?.provider).toBe("n8n");
    expect(syncWhatsAppContactsMock).toHaveBeenCalledTimes(1);
  });
});

