import { beforeEach, describe, expect, it, vi } from "vitest";

// Erro conhecido do Prisma simulado para exercitar o tratamento de duplicidade
const { PrismaClientKnownRequestError } = vi.hoisted(() => {
  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(message: string, options: { code: string }) {
      super(message);
      this.name = "PrismaClientKnownRequestError";
      this.code = options.code;
    }
  }

  return { PrismaClientKnownRequestError };
});

const conversationFindUnique = vi.fn();
const conversationCreate = vi.fn();
const conversationUpdate = vi.fn();
const conversationFindMany = vi.fn();
const messageCreate = vi.fn();
const messageUpdate = vi.fn();
const messageFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  Prisma: { PrismaClientKnownRequestError },
  prisma: {
    conversation: {
      findUnique: (...args: unknown[]) => conversationFindUnique(...args),
      create: (...args: unknown[]) => conversationCreate(...args),
      update: (...args: unknown[]) => conversationUpdate(...args),
      findMany: (...args: unknown[]) => conversationFindMany(...args)
    },
    message: {
      create: (...args: unknown[]) => messageCreate(...args),
      update: (...args: unknown[]) => messageUpdate(...args),
      findMany: (...args: unknown[]) => messageFindMany(...args)
    }
  }
}));

const buildConversationContextMock = vi.fn();
vi.mock("@/server/services/chat-context", () => ({
  buildConversationContext: (...args: unknown[]) => buildConversationContextMock(...args)
}));

import { ChatService, type InboundPayload } from "./chat-service";

const service = new ChatService();

const inboundPayload: InboundPayload = {
  provider: "uazapi",
  mode: "production",
  event: "message",
  instance: "inst-1",
  wa_chat_id: "5511999999999",
  wa_message_id: "wamid-1",
  fromMe: false,
  pushName: "Cliente",
  timestamp: 1_800_000_000,
  message: { type: "text", text: "Olá", caption: null, media: null },
  raw: {}
};

describe("ChatService.findOrCreateConversation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reutiliza a conversa existente sem criar uma nova", async () => {
    const existing = { id: "c1", waChatId: "5511999999999" };
    conversationFindUnique.mockResolvedValue(existing);

    await expect(service.findOrCreateConversation("5511999999999")).resolves.toBe(existing);
    expect(conversationCreate).not.toHaveBeenCalled();
  });

  it("cria a conversa com os padrões quando não existe", async () => {
    conversationFindUnique.mockResolvedValue(null);
    conversationCreate.mockResolvedValue({ id: "c2" });

    await service.findOrCreateConversation("5511888888888", "inst-2");

    expect(conversationCreate).toHaveBeenCalledWith({
      data: {
        waChatId: "5511888888888",
        instance: "inst-2",
        status: "open",
        botActive: true,
        humanActive: false
      }
    });
  });
});

describe("ChatService.saveMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  const messageData = {
    waMessageId: "wamid-1",
    conversationId: "c1",
    direction: "in" as const,
    type: "text",
    body: "Olá",
    mediaUrl: null,
    mimetype: null,
    status: "delivered"
  };

  it("cria a mensagem quando ainda não existe", async () => {
    messageCreate.mockResolvedValue({ id: "m1" });

    await expect(service.saveMessage(messageData)).resolves.toEqual({
      message: { id: "m1" },
      isDuplicate: false
    });
  });

  it("atualiza a mensagem e sinaliza duplicidade em caso de P2002", async () => {
    messageCreate.mockRejectedValue(new PrismaClientKnownRequestError("duplicado", { code: "P2002" }));
    messageUpdate.mockResolvedValue({ id: "m1", status: "read" });

    await expect(service.saveMessage({ ...messageData, status: "read" })).resolves.toEqual({
      message: { id: "m1", status: "read" },
      isDuplicate: true
    });
    expect(messageUpdate).toHaveBeenCalledWith({
      where: { waMessageId: "wamid-1" },
      data: { status: "read", mediaUrl: null }
    });
  });

  it("propaga erros que não são de duplicidade", async () => {
    messageCreate.mockRejectedValue(new Error("banco indisponível"));

    await expect(service.saveMessage(messageData)).rejects.toThrow("banco indisponível");
    expect(messageUpdate).not.toHaveBeenCalled();
  });
});

describe("ChatService.updateMessageStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("atualiza o status da mensagem", async () => {
    messageUpdate.mockResolvedValue({ id: "m1" });
    await service.updateMessageStatus("wamid-1", "read");

    expect(messageUpdate).toHaveBeenCalledWith({ where: { waMessageId: "wamid-1" }, data: { status: "read" } });
  });

  it("não propaga erro quando a mensagem não é encontrada", async () => {
    messageUpdate.mockRejectedValue(new Error("not found"));
    await expect(service.updateMessageStatus("wamid-x", "read")).resolves.toBeUndefined();
  });
});

describe("ChatService.processInboundMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conversationFindUnique.mockResolvedValue({ id: "c1", waChatId: inboundPayload.wa_chat_id, assignedTo: null });
    conversationUpdate.mockResolvedValue({});
    buildConversationContextMock.mockResolvedValue({ botActive: true, humanActive: false, assignedTo: null });
  });

  it("encerra sem ações quando a mensagem é duplicada", async () => {
    messageCreate.mockRejectedValue(new PrismaClientKnownRequestError("duplicado", { code: "P2002" }));
    messageUpdate.mockResolvedValue({ id: "m1" });

    const result = await service.processInboundMessage(inboundPayload);

    expect(result.isDuplicate).toBe(true);
    expect(result.response.mode).toBe("hybrid");
    expect(result.response.actions).toEqual([]);
    expect(conversationUpdate).not.toHaveBeenCalled();
  });

  it("responde em modo bot quando o bot está ativo e não há humano", async () => {
    messageCreate.mockResolvedValue({ id: "m2" });

    const result = await service.processInboundMessage(inboundPayload);

    expect(result.isDuplicate).toBe(false);
    expect(result.response.mode).toBe("bot");
    expect(result.response.actions.map((action) => action.type)).toEqual([
      "mark_read",
      "typing_start",
      "typing_stop"
    ]);
    expect(result.response.suggestions).toEqual([]);
    expect(conversationUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { lastMessageAt: expect.any(Date) }
    });
  });

  it("responde em modo humano com sugestões quando há atendimento ativo", async () => {
    messageCreate.mockResolvedValue({ id: "m3" });
    buildConversationContextMock.mockResolvedValue({ botActive: false, humanActive: true, assignedTo: "agente-1" });

    const result = await service.processInboundMessage(inboundPayload);

    expect(result.response.mode).toBe("human");
    expect(result.response.suggestions).toEqual([{ text: "Olá, como posso ajudar?" }]);
    expect(result.response.routing.assignee).toBe("agente-1");
  });

  it("usa texto da legenda quando a mensagem não tem texto", async () => {
    messageCreate.mockResolvedValue({ id: "m4" });
    buildConversationContextMock.mockResolvedValue({ botActive: false, humanActive: false, assignedTo: null });

    await service.processInboundMessage({
      ...inboundPayload,
      message: { type: "image", text: null, caption: "Foto do equipamento", media: { url: "http://x/img.png", mimetype: "image/png" } }
    });

    expect(messageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        body: "Foto do equipamento",
        mediaUrl: "http://x/img.png",
        mimetype: "image/png"
      })
    });
  });
});

describe("ChatService consultas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista mensagens da conversa em ordem cronológica", async () => {
    messageFindMany.mockResolvedValue([]);
    await service.getMessages("c1");

    expect(messageFindMany).toHaveBeenCalledWith({
      where: { conversationId: "c1" },
      orderBy: { createdAt: "asc" }
    });
  });

  it("lista conversas com a última mensagem", async () => {
    conversationFindMany.mockResolvedValue([]);
    await service.listConversations();

    expect(conversationFindMany).toHaveBeenCalledWith({
      orderBy: { lastMessageAt: "desc" },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" }
        }
      }
    });
  });
});
