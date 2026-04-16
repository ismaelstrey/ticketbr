import { describe, expect, it } from "vitest";
import {
  CanonicalTicketChatEventSchema,
  createChatMessageReceivedEvent,
  createChatTicketLinkedEvent,
  toWebhookDispatchPayload,
} from "@/server/contracts/ticket-chat-events";

describe("ticket-chat canonical event contract", () => {
  it("creates a valid chat.message.received canonical event", () => {
    const event = createChatMessageReceivedEvent({
      provider: "uazapi",
      mode: "webhook",
      event: "message",
      instance: "ticketbr-main",
      waChatId: "5511999999999@s.whatsapp.net",
      waMessageId: "wamid-1",
      fromMe: false,
      pushName: "Cliente",
      timestamp: 1710000000,
      message: {
        type: "text",
        text: "oi",
        caption: null,
        media: null,
      },
      raw: { providerPayload: true },
    });

    const parsed = CanonicalTicketChatEventSchema.safeParse(event);
    expect(parsed.success).toBe(true);
    expect(event.type).toBe("chat.message.received");
    expect(event.schemaVersion).toBe("1.0.0");
  });

  it("creates a valid chat.ticket.linked canonical event and preserves webhook compatibility fields", () => {
    const event = createChatTicketLinkedEvent({
      ticketId: "tic_1",
      contactId: "5511999999999@s.whatsapp.net",
      channel: "whatsapp",
      conversationId: "conv_1",
      actor: { type: "user", id: "usr_1", name: "Agente" },
    });

    const dispatchPayload = toWebhookDispatchPayload(event);
    expect(dispatchPayload).toMatchObject({
      type: "chat.ticket.linked",
      source: "ticketbr-chat",
      occurredAt: expect.any(String),
      schemaVersion: "1.0.0",
      eventId: expect.any(String),
      data: {
        ticketId: "tic_1",
        contactId: "5511999999999@s.whatsapp.net",
        channel: "whatsapp",
        conversationId: "conv_1",
      },
    });
  });

  it("rejects a malformed canonical event", () => {
    const invalidEvent = {
      type: "chat.ticket.linked",
      source: "ticketbr-chat",
      occurredAt: new Date().toISOString(),
      schemaVersion: "1.0.0",
      eventId: crypto.randomUUID(),
      data: {
        ticketId: "",
        contactId: "",
        channel: "whatsapp",
        conversationId: "",
      },
    };

    const parsed = CanonicalTicketChatEventSchema.safeParse(invalidEvent);
    expect(parsed.success).toBe(false);
  });
});
