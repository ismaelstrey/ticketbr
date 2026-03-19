import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const resolveWhatsAppConfigMock = vi.fn();
const fetchConversationsFromN8nMock = vi.fn();
const isN8nConfiguredMock = vi.fn();
const fetchConversationsFromEvolutionMock = vi.fn();
const evolutionIsConfiguredMock = vi.fn();
const fetchConversationsFromUazapiMock = vi.fn();
const uazapiIsConfiguredMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    funcionario: {
      findMany: findManyMock
    }
  }
}));

vi.mock("@/server/services/whatsapp-settings", () => ({
  resolveWhatsAppConfig: resolveWhatsAppConfigMock
}));

vi.mock("@/server/services/n8n-adapter", () => ({
  fetchConversationsFromN8n: fetchConversationsFromN8nMock,
  isN8nConfigured: isN8nConfiguredMock
}));

vi.mock("@/server/services/evolution-service", () => ({
  fetchConversationsFromEvolution: fetchConversationsFromEvolutionMock,
  evolutionIsConfigured: evolutionIsConfiguredMock
}));

vi.mock("@/server/services/uazapi-service", () => ({
  fetchConversationsFromUazapi: fetchConversationsFromUazapiMock,
  uazapiIsConfigured: uazapiIsConfiguredMock
}));

describe("GET /api/chat/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyMock.mockResolvedValue([]);
    isN8nConfiguredMock.mockReturnValue(false);
    evolutionIsConfiguredMock.mockReturnValue(false);
    uazapiIsConfiguredMock.mockReturnValue(false);
  });

  it("usa UAZAPI quando ela está selecionada como provider padrão", async () => {
    resolveWhatsAppConfigMock.mockResolvedValueOnce({
      whatsappProvider: "uazapi",
      uazapiBaseUrl: "https://api.uazapi.com",
      uazapiToken: "tok"
    });
    uazapiIsConfiguredMock.mockReturnValueOnce(true);
    fetchConversationsFromUazapiMock.mockResolvedValueOnce([]);

    const { GET } = await import("./route");
    const res = await GET({} as any);
    expect(res.status).toBe(200);
    expect(fetchConversationsFromUazapiMock).toHaveBeenCalledTimes(1);
    expect(fetchConversationsFromN8nMock).not.toHaveBeenCalled();
    expect(fetchConversationsFromEvolutionMock).not.toHaveBeenCalled();
  });

  it("retorna contatos do provider quando o banco está indisponível", async () => {
    resolveWhatsAppConfigMock.mockResolvedValueOnce({
      whatsappProvider: "uazapi",
      uazapiBaseUrl: "https://api.uazapi.com",
      uazapiToken: "tok"
    });
    uazapiIsConfiguredMock.mockReturnValueOnce(true);
    findManyMock.mockRejectedValueOnce(new Error("db down"));
    fetchConversationsFromUazapiMock.mockResolvedValueOnce([
      {
        id: "wa:5511999999999",
        name: "Cliente",
        phone: "5511999999999",
        email: undefined,
        company: "Sem empresa",
        tags: ["WhatsApp"],
        conversationId: "5511999999999@s.whatsapp.net",
        lastMessagePreview: "oi",
        lastMessageAt: "2026-03-19T00:00:00.000Z"
      }
    ]);

    const { GET } = await import("./route");
    const res = await GET({} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe("wa:5511999999999");
    expect(body.data[0].conversationId).toBe("5511999999999@s.whatsapp.net");
  });
});
