import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchConversationsFromN8n, resolvePath, sendMessageToN8n } from "./n8n-adapter";

describe("n8n-adapter resolvePath", () => {
  it("retorna default para contacts se não configurado", () => {
    expect(resolvePath({}, "contacts")).toBe("/todos/contatos");
  });

  it("retorna valor configurado para contacts", () => {
    expect(resolvePath({ n8nContactsPath: "/custom/contacts" }, "contacts")).toBe("/custom/contacts");
  });
});

describe("n8n-adapter sendMessageToN8n", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prioriza o base de webhook do n8n para envio de mensagens", async () => {
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
    expect(fetchMock.mock.calls[0][0]).toBe("https://n8n.example.com/webhook/send");
  });

  it("faz fallback para n8nBaseUrl quando o base de webhook retorna 404", async () => {
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
    expect(fetchMock.mock.calls[0][0]).toBe("https://n8n.example.com/webhook/send");
    expect(fetchMock.mock.calls[1][0]).toBe("https://n8n.example.com/api/chat/send");
  });

  it("usa o base de webhook em producao mesmo com n8nBaseUrl apontando para a UI", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] })
    });

    vi.stubGlobal("fetch", fetchMock as any);

    await fetchConversationsFromN8n({
      n8nBaseUrl: "https://n8n.strey.com.br",
      n8nWebhookUrl: "https://n8n.strey.com.br/webhook/ticketbr-events"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://n8n.strey.com.br/webhook/conversations");
  });
});
