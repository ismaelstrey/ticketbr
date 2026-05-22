import { beforeEach, describe, expect, it, vi } from "vitest";

const requireCustomerContextMock = vi.fn();
const findOrCreateConversationMock = vi.fn();
const saveMessageMock = vi.fn();
const messageFindManyMock = vi.fn();
const conversationUpdateMock = vi.fn();

vi.mock("@/server/services/customer-context", () => ({
  requireCustomerContext: requireCustomerContextMock
}));

vi.mock("@/server/services/chat-service", () => ({
  chatService: {
    findOrCreateConversation: findOrCreateConversationMock,
    saveMessage: saveMessageMock
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    message: {
      findMany: messageFindManyMock
    },
    conversation: {
      update: conversationUpdateMock
    }
  }
}));

describe("/api/customer/chat/messages", () => {
  beforeEach(() => {
    vi.resetModules();
    requireCustomerContextMock.mockReset();
    findOrCreateConversationMock.mockReset();
    saveMessageMock.mockReset();
    messageFindManyMock.mockReset();
    conversationUpdateMock.mockReset();

    requireCustomerContextMock.mockResolvedValue({
      user: { id: "u1", email: "cliente@acme.com", name: "Cliente", role: "CUSTOMER" },
      solicitante: { id: "s1", nome_fantasia: "ACME", razao_social: "ACME", email: "acme@a.com" },
      member: { id: "f1", solicitante_id: "s1", isAdmin: false }
    });
    findOrCreateConversationMock.mockResolvedValue({
      id: "conv1",
      waChatId: "portal:f1",
      assignedTo: null,
      humanActive: false,
      botActive: true
    });
  });

  it("GET carrega somente a conversa portal do funcionario logado", async () => {
    messageFindManyMock.mockResolvedValueOnce([
      {
        id: "m1",
        direction: "in",
        type: "text",
        body: "Ola",
        mediaUrl: null,
        mimetype: null,
        status: "delivered",
        createdAt: new Date("2026-05-01T10:00:00.000Z")
      }
    ]);

    const { GET } = await import("./route");
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(findOrCreateConversationMock).toHaveBeenCalledWith("portal:f1", "portal");
    expect(body.data[0].text).toBe("Ola");
  });

  it("POST salva mensagem inbound do cliente sem WhatsApp", async () => {
    conversationUpdateMock.mockResolvedValueOnce({});
    saveMessageMock.mockResolvedValueOnce({
      message: {
        id: "m2",
        body: "Preciso de ajuda",
        status: "delivered",
        createdAt: new Date("2026-05-01T10:01:00.000Z")
      }
    });

    const { POST } = await import("./route");
    const req = { json: async () => ({ text: "Preciso de ajuda" }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(saveMessageMock).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: "conv1",
      direction: "in",
      body: "Preciso de ajuda"
    }));
    expect(body.data.channel).toBe("portal");
  });
});
