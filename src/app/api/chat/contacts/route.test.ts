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
  it("prioriza contatos com conversa em aberto no topo da lista", async () => {
    resolveWhatsAppConfigMock.mockResolvedValueOnce({ whatsappProvider: "uazapi" });
    uazapiIsConfiguredMock.mockReturnValueOnce(true);
    findManyMock.mockResolvedValueOnce([
      {
        id: "f1",
        nome: "Bruno",
        email: null,
        telefone: "5511999998888",
        remoteJid: "5511999998888@s.whatsapp.net",
        whatsappId: null,
        solicitante: { id: "s1", nome_fantasia: "Empresa A", razao_social: null }
      },
      {
        id: "f2",
        nome: "Ana",
        email: null,
        telefone: "5511999997777",
        remoteJid: "5511999997777@s.whatsapp.net",
        whatsappId: null,
        solicitante: { id: "s1", nome_fantasia: "Empresa A", razao_social: null }
      }
    ]);
    chatConversationFindManyMock.mockResolvedValueOnce([
      {
        contactId: "5511999997777@s.whatsapp.net",
        channel: "whatsapp",
        conversationId: "5511999997777@s.whatsapp.net"
      }
    ]);
    fetchConversationsFromUazapiMock.mockResolvedValueOnce([
      {
        id: "5511999998888@s.whatsapp.net",
        number: "5511999998888",
        name: "Bruno",
        lastMessage: "mensagem mais recente",
        lastMessageAt: "2026-03-23T12:00:00.000Z"
      },
      {
        id: "5511999997777@s.whatsapp.net",
        number: "5511999997777",
        name: "Ana",
        lastMessage: "mensagem anterior",
        lastMessageAt: "2026-03-23T11:00:00.000Z"
      }
    ]);

    const { GET } = await import("./route");
    const res = await GET({} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].name).toBe("Ana");
    expect(body.data[0].hasOpenConversation).toBe(true);
    expect(body.data[1].name).toBe("Bruno");
  });

});
