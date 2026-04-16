import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMessageCreateResponseSchema, EnvelopeWithErrorSchema } from "./schemas";

const resolveWhatsAppConfigMock = vi.fn();
const sendOutboundMessageMock = vi.fn();
const getSessionMock = vi.fn();
const conversationFindUniqueMock = vi.fn();
const userFindUniqueMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: conversationFindUniqueMock,
      update: vi.fn(),
    },
    user: {
      findUnique: userFindUniqueMock,
    },
  },
}));

vi.mock("@/server/services/whatsapp-settings", () => ({
  resolveWhatsAppConfig: resolveWhatsAppConfigMock,
}));

vi.mock("@/server/services/chat-outbound", () => ({
  sendOutboundMessage: sendOutboundMessageMock,
}));

vi.mock("@/lib/auth", () => ({
  getSession: getSessionMock,
}));

describe("API Contract - POST /api/chat/messages", () => {
  beforeEach(() => {
    resolveWhatsAppConfigMock.mockReset();
    sendOutboundMessageMock.mockReset();
    getSessionMock.mockReset();
    conversationFindUniqueMock.mockReset();
    userFindUniqueMock.mockReset();
    vi.resetModules();

    delete process.env.DATABASE_URL;
    getSessionMock.mockResolvedValue({ id: "user_1", name: "Agente" });
    conversationFindUniqueMock.mockResolvedValue(null);
    userFindUniqueMock.mockResolvedValue(null);
  });

  it("returns success payload contract when outbound message is accepted", async () => {
    resolveWhatsAppConfigMock.mockResolvedValueOnce({ n8nBaseUrl: "http://n8n", n8nWebhookUrl: "http://hook" });
    sendOutboundMessageMock.mockResolvedValueOnce({ waMessageId: "out_1" });

    const { POST } = await import("@/app/api/chat/messages/route");
    const req = {
      json: async () => ({
        contactId: "5511999999999@c.us",
        channel: "whatsapp",
        contactPhone: "5511999999999",
        text: "oi",
      }),
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(ChatMessageCreateResponseSchema.safeParse(body).success).toBe(true);
  });

  it("returns error payload contract when provider is not configured", async () => {
    resolveWhatsAppConfigMock.mockResolvedValueOnce(null);
    sendOutboundMessageMock.mockRejectedValueOnce(new Error("Provider WhatsApp inválido"));

    const { POST } = await import("@/app/api/chat/messages/route");
    const req = {
      json: async () => ({
        contactId: "5511999999999@c.us",
        channel: "whatsapp",
        contactPhone: "5511999999999",
        text: "oi",
      }),
    } as any;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(EnvelopeWithErrorSchema.safeParse(body).success).toBe(true);
  });
});
