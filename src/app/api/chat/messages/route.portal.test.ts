import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const findOrCreateConversationMock = vi.fn();
const saveMessageMock = vi.fn();
const conversationFindUniqueMock = vi.fn();
const conversationUpdateMock = vi.fn();
const userFindUniqueMock = vi.fn();
const sendOutboundMessageMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSession: getSessionMock
}));

vi.mock("@/server/services/chat-service", () => ({
  chatService: {
    findOrCreateConversation: findOrCreateConversationMock,
    saveMessage: saveMessageMock
  }
}));

vi.mock("@/server/services/chat-outbound", () => ({
  sendOutboundMessage: sendOutboundMessageMock
}));

vi.mock("@/server/services/whatsapp-settings", () => ({
  resolveWhatsAppConfig: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: conversationFindUniqueMock,
      update: conversationUpdateMock
    },
    user: {
      findUnique: userFindUniqueMock
    }
  }
}));

describe("/api/chat/messages canal portal", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionMock.mockReset();
    findOrCreateConversationMock.mockReset();
    saveMessageMock.mockReset();
    conversationFindUniqueMock.mockReset();
    conversationUpdateMock.mockReset();
    userFindUniqueMock.mockReset();
    sendOutboundMessageMock.mockReset();

    getSessionMock.mockResolvedValue({ id: "agent1", name: "Atendente" });
    conversationFindUniqueMock.mockResolvedValue(null);
    findOrCreateConversationMock.mockResolvedValue({ id: "conv1", assignedTo: "agent1" });
    conversationUpdateMock.mockResolvedValue({});
    saveMessageMock.mockResolvedValue({
      message: {
        id: "m1",
        body: "Resposta",
        createdAt: new Date("2026-05-01T10:00:00.000Z")
      }
    });
  });

  it("POST persiste mensagem portal sem chamar WhatsApp", async () => {
    const { POST } = await import("./route");
    const req = {
      json: async () => ({ channel: "portal", contactId: "portal:f1", text: "Resposta" })
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(sendOutboundMessageMock).not.toHaveBeenCalled();
    expect(saveMessageMock).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: "conv1",
      direction: "out",
      body: "Resposta"
    }));
    expect(body.data.direction).toBe("out");
  });
});
