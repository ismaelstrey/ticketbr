import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  syncWhatsAppContacts,
  syncWhatsAppContactsFromN8n,
  syncWhatsAppContactsFromUazapi
} from "./whatsapp-contacts";
import * as n8nAdapter from "./n8n-adapter";
import * as uazapiAdapter from "./uazapi-adapter";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock("./n8n-adapter", async (importOriginal) => {
  const actual = await importOriginal<typeof n8nAdapter>();
  return {
    ...actual,
    requestN8n: vi.fn(),
    requestN8nChatPath: vi.fn(),
    isN8nConfigured: vi.fn().mockReturnValue(true)
  };
});

vi.mock("./uazapi-adapter", async (importOriginal) => {
  const actual = await importOriginal<typeof uazapiAdapter>();
  return {
    ...actual,
    requestUazapi: vi.fn(),
    isUazapiConfigured: vi.fn().mockReturnValue(true)
  };
});

describe("whatsapp-contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve usar a construção dinâmica da URL quando n8nWebhookUrl estiver presente", async () => {
    const config = {
      n8nWebhookUrl: "https://n8n.strey.com.br/webhook/ticketbr-events"
    };

    const mockPayload = [{ id: "1", remoteJid: "551199999999@s.whatsapp.net", pushName: "Teste" }];
    vi.mocked(n8nAdapter.requestN8n).mockResolvedValueOnce(mockPayload);

    const result = await syncWhatsAppContactsFromN8n(config);

    expect(n8nAdapter.requestN8n).toHaveBeenCalledWith(
      "https://n8n.strey.com.br/webhook/wa/baileys/action/contacts",
      config,
      { method: "GET" }
    );

    expect(result).toEqual({
      provider: "n8n",
      endpoint: "https://n8n.strey.com.br/webhook/wa/baileys/action/contacts",
      totalReceived: 1,
      totalSaved: 1
    });
  });

  it("deve fazer fallback para n8nContactsPath se a chamada dinâmica falhar", async () => {
    const config = {
      n8nWebhookUrl: "https://n8n.strey.com.br/webhook/ticketbr-events",
      n8nContactsPath: "/fallback/contacts"
    };

    vi.mocked(n8nAdapter.requestN8n).mockRejectedValueOnce(new Error("404 Not Found"));
    vi.mocked(n8nAdapter.requestN8nChatPath).mockResolvedValueOnce([]);

    const result = await syncWhatsAppContactsFromN8n(config);

    expect(n8nAdapter.requestN8nChatPath).toHaveBeenCalledWith(
      "/fallback/contacts",
      config,
      { method: "GET" }
    );

    expect(result.endpoint).toBe("/fallback/contacts");
  });

  it("deve sincronizar contatos via UAZAPI usando o provedor padrão", async () => {
    const config = {
      whatsappProvider: "uazapi" as const,
      uazapiBaseUrl: "https://api.uazapi.com",
      uazapiToken: "tok"
    };

    vi.mocked(uazapiAdapter.requestUazapi)
      .mockResolvedValueOnce([
        { jid: "5511999999999@s.whatsapp.net", contactName: "João Silva" }
      ])
      .mockResolvedValueOnce({ instance: { id: "inst_01" } });

    const result = await syncWhatsAppContactsFromUazapi(config);

    expect(uazapiAdapter.requestUazapi).toHaveBeenNthCalledWith(1, { pathOrUrl: "/contacts", method: "GET" }, config);
    expect(uazapiAdapter.requestUazapi).toHaveBeenNthCalledWith(2, { pathOrUrl: "/instance/status", method: "GET" }, config);
    expect(result).toEqual({
      provider: "uazapi",
      endpoint: "/contacts",
      totalReceived: 1,
      totalSaved: 1
    });
  });

  it("deve rotear sincronização para UAZAPI quando esse for o provider selecionado", async () => {
    const config = {
      whatsappProvider: "uazapi" as const,
      uazapiBaseUrl: "https://api.uazapi.com",
      uazapiToken: "tok"
    };

    vi.mocked(uazapiAdapter.requestUazapi)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ instance: { id: "inst_01" } });

    const result = await syncWhatsAppContacts(config);

    expect(result.provider).toBe("uazapi");
    expect(n8nAdapter.requestN8n).not.toHaveBeenCalled();
  });
});
