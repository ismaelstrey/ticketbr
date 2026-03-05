import { describe, expect, it, vi, beforeEach } from "vitest";

const resolveWhatsAppConfigMock = vi.fn();
const isN8nConfiguredMock = vi.fn();
const sendMessageToN8nMock = vi.fn();
const emitChatEventToN8nMock = vi.fn();
const evolutionIsConfiguredMock = vi.fn();
const sendTextToEvolutionMock = vi.fn();
const sendMediaToEvolutionMock = vi.fn();

vi.mock("@/server/services/whatsapp-settings", () => ({
  resolveWhatsAppConfig: resolveWhatsAppConfigMock
}));

vi.mock("@/server/services/n8n-adapter", () => ({
  isN8nConfigured: isN8nConfiguredMock,
  sendMessageToN8n: sendMessageToN8nMock,
  emitChatEventToN8n: emitChatEventToN8nMock,
  fetchMessagesFromN8n: vi.fn()
}));

vi.mock("@/server/services/evolution-service", () => ({
  evolutionIsConfigured: evolutionIsConfiguredMock,
  sendTextToEvolution: sendTextToEvolutionMock,
  sendMediaToEvolution: sendMediaToEvolutionMock,
  fetchMessagesFromEvolution: vi.fn()
}));

describe("POST /api/chat/messages", () => {
  beforeEach(() => {
    resolveWhatsAppConfigMock.mockReset();
    isN8nConfiguredMock.mockReset();
    sendMessageToN8nMock.mockReset();
    emitChatEventToN8nMock.mockReset();
    evolutionIsConfiguredMock.mockReset();
    sendTextToEvolutionMock.mockReset();
    sendMediaToEvolutionMock.mockReset();
  });

  it("retorna 400 quando WhatsApp não está configurado", async () => {
    resolveWhatsAppConfigMock.mockResolvedValueOnce(null);
    isN8nConfiguredMock.mockReturnValueOnce(false);
    evolutionIsConfiguredMock.mockReturnValueOnce(false);
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
    isN8nConfiguredMock.mockReturnValueOnce(true);
    evolutionIsConfiguredMock.mockReturnValueOnce(false);
    sendMessageToN8nMock.mockResolvedValueOnce({});
    emitChatEventToN8nMock.mockResolvedValueOnce(undefined);
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
    expect(sendMessageToN8nMock).toHaveBeenCalledTimes(1);
  });

  it("retorna 502 quando o envio para N8N falha", async () => {
    resolveWhatsAppConfigMock.mockResolvedValueOnce({ n8nBaseUrl: "http://n8n", n8nWebhookUrl: "http://hook" });
    isN8nConfiguredMock.mockReturnValueOnce(true);
    evolutionIsConfiguredMock.mockReturnValueOnce(false);
    sendMessageToN8nMock.mockRejectedValueOnce(new Error("n8n request failed (401)"));
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
    expect(body.error).toContain("n8n request failed");
  });
});

