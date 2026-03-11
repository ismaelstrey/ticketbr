import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncWhatsAppContactsFromN8n } from "./whatsapp-contacts";
import * as n8nAdapter from "./n8n-adapter";

// Mock das dependências
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock do n8n-adapter
vi.mock("./n8n-adapter", async (importOriginal) => {
  const actual = await importOriginal<typeof n8nAdapter>();
  return {
    ...actual,
    requestN8n: vi.fn(),
    requestN8nChatPath: vi.fn(),
    isN8nConfigured: vi.fn().mockReturnValue(true),
  };
});

describe("syncWhatsAppContactsFromN8n", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve usar a construção dinâmica da URL quando n8nWebhookUrl estiver presente", async () => {
    const config = {
      n8nWebhookUrl: "https://n8n.strey.com.br/webhook/ticketbr-events",
    };

    const mockPayload = [{ id: "1", remoteJid: "551199999999@s.whatsapp.net", pushName: "Teste" }];
    
    // Configura o mock do requestN8n para retornar sucesso quando chamado com a URL dinâmica
    vi.mocked(n8nAdapter.requestN8n).mockResolvedValueOnce(mockPayload);

    const result = await syncWhatsAppContactsFromN8n(config);

    // Verifica se requestN8n foi chamado com a URL correta
    expect(n8nAdapter.requestN8n).toHaveBeenCalledWith(
      "https://n8n.strey.com.br/webhook/wa/baileys/action/contacts",
      config,
      { method: "GET" }
    );

    // Verifica o formato do retorno
    expect(result).toEqual({
      endpoint: "https://n8n.strey.com.br/webhook/wa/baileys/action/contacts",
      totalReceived: 1,
      totalSaved: 1,
    });
  });

  it("deve fazer fallback para n8nContactsPath se a chamada dinâmica falhar", async () => {
    const config = {
      n8nWebhookUrl: "https://n8n.strey.com.br/webhook/ticketbr-events",
      n8nContactsPath: "/fallback/contacts"
    };

    // Simula erro na chamada dinâmica
    vi.mocked(n8nAdapter.requestN8n).mockRejectedValueOnce(new Error("404 Not Found"));
    
    // Simula sucesso no fallback
    vi.mocked(n8nAdapter.requestN8nChatPath).mockResolvedValueOnce([]);

    const result = await syncWhatsAppContactsFromN8n(config);

    // Verifica se tentou a dinâmica primeiro
    expect(n8nAdapter.requestN8n).toHaveBeenCalledWith(
      "https://n8n.strey.com.br/webhook/wa/baileys/action/contacts",
      config,
      { method: "GET" }
    );

    // Verifica se chamou o fallback
    expect(n8nAdapter.requestN8nChatPath).toHaveBeenCalledWith(
      "/fallback/contacts",
      config,
      { method: "GET" }
    );

    expect(result.endpoint).toBe("/fallback/contacts");
  });

  it("deve usar fallback direto se n8nWebhookUrl não contiver /webhook", async () => {
    const config = {
      n8nWebhookUrl: "https://invalid-url.com", // URL sem /webhook
      n8nContactsPath: "/todos/contatos"
    };

    vi.mocked(n8nAdapter.requestN8nChatPath).mockResolvedValueOnce([]);

    await syncWhatsAppContactsFromN8n(config);

    // Não deve chamar requestN8n com URL dinâmica
    expect(n8nAdapter.requestN8n).not.toHaveBeenCalled();

    // Deve chamar requestN8nChatPath direto
    expect(n8nAdapter.requestN8nChatPath).toHaveBeenCalledWith(
      "/todos/contatos",
      config,
      { method: "GET" }
    );
  });
});
