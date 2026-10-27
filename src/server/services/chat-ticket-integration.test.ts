import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NormalizedInboundResult } from "./chat-inbound-normalizer";

const chatConversationFindFirst = vi.fn();
const chatConversationUpdate = vi.fn();
const funcionarioFindFirst = vi.fn();
const funcionarioFindMany = vi.fn();
const ticketEventCreate = vi.fn();
const createTicketMock = vi.fn();
const emitChatEventMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatConversation: {
      findFirst: chatConversationFindFirst,
      update: chatConversationUpdate
    },
    funcionario: {
      findFirst: funcionarioFindFirst,
      findMany: funcionarioFindMany
    },
    ticketEvent: {
      create: ticketEventCreate
    }
  }
}));

vi.mock("@/server/services/ticket-service", () => ({
  createTicket: createTicketMock
}));

vi.mock("@/server/services/n8n-adapter", () => ({
  emitChatEventToN8n: emitChatEventMock
}));

type InboundMessage = Extract<NormalizedInboundResult, { kind: "message" }>;

function buildInbound(overrides: Partial<InboundMessage["payload"]> = {}): InboundMessage {
  return {
    kind: "message",
    source: "n8n",
    payload: {
      provider: "n8n",
      mode: "waha",
      event: "message",
      instance: "ticketbr",
      wa_chat_id: "555181754701@c.us",
      wa_message_id: "wamid.1",
      fromMe: false,
      pushName: "Ismael",
      timestamp: 1710000000000,
      message: { type: "text", text: "Preciso de ajuda", caption: null, media: null },
      raw: {},
      ...overrides
    }
  };
}

describe("chat-ticket-integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatConversationUpdate.mockResolvedValue({ id: "cc_1" });
    emitChatEventMock.mockResolvedValue(undefined);
  });

  it("cria e vincula um ticket quando o contato é um funcionário conhecido", async () => {
    chatConversationFindFirst.mockResolvedValueOnce({
      id: "cc_1",
      ticketId: null,
      conversationId: "555181754701@c.us"
    });
    funcionarioFindFirst.mockResolvedValueOnce({
      id: "func_1",
      nome: "Ismael Strey",
      telefone: "555181754701",
      remoteJid: "555181754701@c.us",
      whatsappId: null,
      solicitante: { id: "sol_1", nome_fantasia: "Cliente X", razao_social: "Cliente X LTDA" }
    });
    createTicketMock.mockResolvedValueOnce({ id: "ticket_1", number: 42 });

    const { ensureTicketForInboundConversation } = await import("./chat-ticket-integration");
    const ticketId = await ensureTicketForInboundConversation(buildInbound());

    expect(ticketId).toBe("ticket_1");
    expect(createTicketMock).toHaveBeenCalledWith(
      expect.objectContaining({
        solicitanteId: "sol_1",
        empresa: "Cliente X",
        assunto: "WhatsApp - Ismael"
      })
    );
    expect(chatConversationUpdate).toHaveBeenCalledWith({
      where: { id: "cc_1" },
      data: { ticketId: "ticket_1" }
    });
    expect(ticketEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ticketId: "ticket_1",
        type: "CHAT_MESSAGE",
        author: "Ismael",
        description: "Preciso de ajuda"
      })
    });
  });

  it("registra a mensagem no ticket existente sem duplicar o ticket", async () => {
    chatConversationFindFirst.mockResolvedValueOnce({
      id: "cc_1",
      ticketId: "ticket_existente",
      conversationId: "555181754701@c.us"
    });

    const { ensureTicketForInboundConversation } = await import("./chat-ticket-integration");
    const ticketId = await ensureTicketForInboundConversation(buildInbound());

    expect(ticketId).toBe("ticket_existente");
    expect(createTicketMock).not.toHaveBeenCalled();
    expect(chatConversationUpdate).not.toHaveBeenCalled();
    expect(ticketEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ ticketId: "ticket_existente", type: "CHAT_MESSAGE" })
    });
  });

  it("ignora mensagens enviadas pelo atendente (fromMe)", async () => {
    const { ensureTicketForInboundConversation } = await import("./chat-ticket-integration");
    const ticketId = await ensureTicketForInboundConversation(buildInbound({ fromMe: true }));

    expect(ticketId).toBeNull();
    expect(chatConversationFindFirst).not.toHaveBeenCalled();
    expect(createTicketMock).not.toHaveBeenCalled();
  });

  it("não abre ticket quando o contato não é um funcionário conhecido", async () => {
    chatConversationFindFirst.mockResolvedValueOnce({
      id: "cc_1",
      ticketId: null,
      conversationId: "5551999999999@c.us"
    });
    funcionarioFindFirst.mockResolvedValueOnce(null);
    funcionarioFindMany.mockResolvedValueOnce([]);

    const { ensureTicketForInboundConversation } = await import("./chat-ticket-integration");
    const ticketId = await ensureTicketForInboundConversation(
      buildInbound({ wa_chat_id: "5551999999999@c.us" })
    );

    expect(ticketId).toBeNull();
    expect(createTicketMock).not.toHaveBeenCalled();
  });
});
