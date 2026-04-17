import { beforeEach, describe, expect, it, vi } from "vitest";

const processInboundMessageMock = vi.fn();
const updateMessageStatusMock = vi.fn();
const appendMessageMock = vi.fn();
const emitChatEventToN8nMock = vi.fn();
const upsertInboundConversationMock = vi.fn();
const syncConversationMessageStatusMock = vi.fn();
const createChatMessageReceivedEventMock = vi.fn((payload) => ({ type: "chat.message.received", payload }));

vi.mock("@/server/services/chat-service", () => ({
  chatService: {
    processInboundMessage: processInboundMessageMock,
    updateMessageStatus: updateMessageStatusMock
  }
}));

vi.mock("@/server/services/chat-memory", () => ({
  appendMessage: appendMessageMock
}));

vi.mock("@/server/services/n8n-adapter", () => ({
  emitChatEventToN8n: emitChatEventToN8nMock
}));

vi.mock("@/server/services/chat-conversation-store", () => ({
  upsertInboundConversation: upsertInboundConversationMock,
  syncConversationMessageStatus: syncConversationMessageStatusMock
}));

vi.mock("@/server/contracts/ticket-chat-events", () => ({
  createChatMessageReceivedEvent: createChatMessageReceivedEventMock
}));

describe("chat-inbound-processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deduplica webhook repetido e evita efeitos colaterais externos", async () => {
    processInboundMessageMock.mockResolvedValueOnce({
      isDuplicate: true,
      response: {
        mode: "hybrid",
        handoff: { required: false, reason: null },
        routing: { queue: "default", priority: "normal", assignee: null },
        actions: [],
        suggestions: []
      }
    });

    const { processNormalizedInboundEvent } = await import("./chat-inbound-processing");
    const result = await processNormalizedInboundEvent({
      kind: "message",
      source: "uazapi",
      payload: {
        provider: "uazapi",
        mode: "rest",
        event: "message",
        instance: "default",
        wa_chat_id: "5511999999999@s.whatsapp.net",
        wa_message_id: "wamid.dup",
        fromMe: false,
        pushName: "Cliente",
        timestamp: 1710000000000,
        message: {
          type: "text",
          text: "Oi",
          caption: null,
          media: null
        },
        raw: {}
      }
    });

    expect(result).toEqual({ ok: true, kind: "message", source: "uazapi", deduplicated: true });
    expect(upsertInboundConversationMock).not.toHaveBeenCalled();
    expect(appendMessageMock).not.toHaveBeenCalled();
    expect(createChatMessageReceivedEventMock).not.toHaveBeenCalled();
    expect(emitChatEventToN8nMock).not.toHaveBeenCalled();
  });

  it("processa mensagem nova e dispara efeitos colaterais esperados", async () => {
    processInboundMessageMock.mockResolvedValueOnce({
      isDuplicate: false,
      response: {
        mode: "bot",
        handoff: { required: false, reason: null },
        routing: { queue: "default", priority: "normal", assignee: null },
        actions: [{ type: "mark_read", wa_message_id: "wamid.new" }],
        suggestions: []
      }
    });

    const { processNormalizedInboundEvent } = await import("./chat-inbound-processing");
    const result = await processNormalizedInboundEvent({
      kind: "message",
      source: "uazapi",
      payload: {
        provider: "uazapi",
        mode: "rest",
        event: "message",
        instance: "default",
        wa_chat_id: "5511999999999@s.whatsapp.net",
        wa_message_id: "wamid.new",
        fromMe: false,
        pushName: "Cliente",
        timestamp: 1710000001000,
        message: {
          type: "text",
          text: "Nova",
          caption: null,
          media: null
        },
        raw: {}
      }
    });

    expect(result).toEqual({ ok: true, kind: "message", source: "uazapi" });
    expect(upsertInboundConversationMock).toHaveBeenCalledTimes(1);
    expect(appendMessageMock).toHaveBeenCalledTimes(1);
    expect(createChatMessageReceivedEventMock).toHaveBeenCalledTimes(1);
    expect(emitChatEventToN8nMock).toHaveBeenCalledTimes(1);
  });
});
