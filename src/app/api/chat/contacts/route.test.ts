import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const resolveWhatsAppConfigMock = vi.fn();
const fetchConversationsFromN8nMock = vi.fn();
const isN8nConfiguredMock = vi.fn();
const fetchConversationsFromEvolutionMock = vi.fn();
const evolutionIsConfiguredMock = vi.fn();
const fetchConversationsFromUazapiMock = vi.fn();
const uazapiIsConfiguredMock = vi.fn();
const chatConversationFindManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    funcionario: {
      findMany: findManyMock
    },
    chatConversation: {
      findMany: chatConversationFindManyMock
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
    chatConversationFindManyMock.mockResolvedValue([]);
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
});
