import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendMessageToN8n } from "./n8n-adapter";

describe("n8n-adapter sendMessageToN8n", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prioriza n8nBaseUrl para envio de mensagens", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true })
    });

    vi.stubGlobal("fetch", fetchMock as any);

    await sendMessageToN8n(
      { text: "oi" },
      {
        n8nBaseUrl: "https://n8n.example.com/api/chat",
        n8nWebhookUrl: "https://n8n.example.com/webhook/messages"
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://n8n.example.com/api/chat/send");
  });

  it("faz fallback para webhook+path quando base retorna 404", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true })
      });

    vi.stubGlobal("fetch", fetchMock as any);

    await sendMessageToN8n(
      { text: "oi" },
      {
        n8nBaseUrl: "https://n8n.example.com/api/chat",
        n8nWebhookUrl: "https://n8n.example.com/webhook/messages"
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://n8n.example.com/api/chat/send");
    expect(fetchMock.mock.calls[1][0]).toBe("https://n8n.example.com/webhook/messages/send");
  });
});
