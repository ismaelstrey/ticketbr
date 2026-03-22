import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatConversation: {
      findFirst: findFirstMock,
      create: createMock,
      update: updateMock,
      findMany: findManyMock
    },
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined)
  }
}));

describe("chat-conversation-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cria uma nova chatConversation quando não existe conversa para o contato", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    createMock.mockResolvedValueOnce({ id: "cc_1" });

    const { upsertInboundConversation } = await import("./chat-conversation-store");
    await upsertInboundConversation({
      kind: "message",
      source: "uazapi",
      payload: {
        provider: "uazapi",
        mode: "rest",
        event: "message",
        instance: "default",
        wa_chat_id: "5511999999999@s.whatsapp.net",
        wa_message_id: "wamid.1",
        fromMe: false,
        pushName: "Cliente",
        timestamp: 1710000000000,
        message: {
          type: "text",
          text: "Olá",
          caption: null,
          media: null
        },
        raw: {}
      }
    });

    expect(createMock).toHaveBeenCalled();
  });

  it("atualiza a conversa existente anexando a mensagem recebida", async () => {
    findFirstMock.mockResolvedValueOnce({
      id: "cc_1",
      contactName: "Cliente",
      messages: [{ id: "wamid.old", contactId: "5511", channel: "whatsapp", direction: "in", text: "anterior", createdAt: "2026-03-20T00:00:00.000Z" }]
    });
    updateMock.mockResolvedValueOnce({ id: "cc_1" });

    const { upsertInboundConversation } = await import("./chat-conversation-store");
    await upsertInboundConversation({
      kind: "message",
      source: "uazapi",
      payload: {
        provider: "uazapi",
        mode: "rest",
        event: "message",
        instance: "default",
        wa_chat_id: "5511999999999@s.whatsapp.net",
        wa_message_id: "wamid.2",
        fromMe: false,
        pushName: "Cliente",
        timestamp: 1710000001000,
        message: {
          type: "text",
          text: "nova",
          caption: null,
          media: null
        },
        raw: {}
      }
    });

    expect(updateMock).toHaveBeenCalled();
  });
});
