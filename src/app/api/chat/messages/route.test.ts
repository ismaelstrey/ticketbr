import { describe, expect, it, vi, beforeEach } from "vitest";

const resolveWhatsAppConfigMock = vi.fn();
const sendOutboundMessageMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {}
}));

vi.mock("@/server/services/whatsapp-settings", () => ({
  resolveWhatsAppConfig: resolveWhatsAppConfigMock
}));

vi.mock("@/server/services/chat-outbound", () => ({
  sendOutboundMessage: sendOutboundMessageMock
}));

describe("POST /api/chat/messages", () => {
  beforeEach(() => {
    resolveWhatsAppConfigMock.mockReset();
    sendOutboundMessageMock.mockReset();
    vi.resetModules();
    delete process.env.DATABASE_URL;
  });

  it("retorna 400 quando WhatsApp não está configurado", async () => {
    resolveWhatsAppConfigMock.mockResolvedValueOnce(null);
    sendOutboundMessageMock.mockRejectedValueOnce(new Error("WhatsApp não está configurado"));
    const { POST } = await import("./route");

    const req = {
      json: async () => ({
        contactId: "c1",
        channel: "whatsapp",
        contactPhone: "5511999999999",
        text: "oi"
      })
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(typeof body.error).toBe("string");
  });

  it("retorna 201 quando envia via N8N com base configurada", async () => {
    resolveWhatsAppConfigMock.mockResolvedValueOnce({ n8nBaseUrl: "http://n8n", n8nWebhookUrl: "http://hook" });
    sendOutboundMessageMock.mockResolvedValueOnce({ waMessageId: "out_1" });
    const { POST } = await import("./route");

    const req = {
      json: async () => ({
        contactId: "c1",
        channel: "whatsapp",
        contactPhone: "5511999999999",
        text: "oi"
      })
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data?.direction).toBe("out");
    expect(sendOutboundMessageMock).toHaveBeenCalledTimes(1);
  });

  it("retorna 502 quando o envio para N8N falha", async () => {
    resolveWhatsAppConfigMock.mockResolvedValueOnce({ n8nBaseUrl: "http://n8n", n8nWebhookUrl: "http://hook" });
    sendOutboundMessageMock.mockRejectedValueOnce(new Error("Falha ao enviar para N8N"));
    const { POST } = await import("./route");

    const req = {
      json: async () => ({
        contactId: "c1",
        channel: "whatsapp",
        contactPhone: "5511999999999",
        text: "oi"
      })
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(String(body.error)).toContain("N8N");
  });

  it("retorna 201 quando envia via UAZAPI com provider selecionado", async () => {
    resolveWhatsAppConfigMock.mockResolvedValueOnce({ whatsappProvider: "uazapi", uazapiBaseUrl: "http://uazapi", uazapiToken: "tok" });
    sendOutboundMessageMock.mockResolvedValueOnce({ waMessageId: "out_uazapi_1" });
    const { POST } = await import("./route");

    const req = {
      json: async () => ({
        contactId: "c1",
        channel: "whatsapp",
        contactPhone: "5511999999999",
        text: "oi"
      })
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data?.direction).toBe("out");
    expect(sendOutboundMessageMock).toHaveBeenCalledTimes(1);
  });
});
