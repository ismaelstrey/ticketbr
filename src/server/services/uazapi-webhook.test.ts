import { describe, expect, it } from "vitest";
import { parseUazapiWebhookPayload } from "./uazapi-webhook";

describe("parseUazapiWebhookPayload", () => {
  it("normaliza mensagens de texto recebidas da UAZAPI", () => {
    const result = parseUazapiWebhookPayload({
      event: "message",
      instance: "ticketbr",
      data: {
        chatid: "5511999999999@s.whatsapp.net",
        messageid: "wamid.abc",
        fromMe: false,
        senderName: "Cliente",
        messageTimestamp: 1710000000,
        message: {
          text: "Olá, preciso de ajuda",
          messageType: "text"
        }
      }
    });

    expect(result.kind).toBe("message");
    expect(result.payload).toMatchObject({
      provider: "uazapi",
      wa_chat_id: "5511999999999@s.whatsapp.net",
      wa_message_id: "wamid.abc",
      fromMe: false,
      message: {
        type: "text",
        text: "Olá, preciso de ajuda"
      }
    });
  });

  it("normaliza mensagens de mídia com legenda", () => {
    const result = parseUazapiWebhookPayload({
      event: "messages",
      instance: "ticketbr",
      data: {
        chatid: "5511888888888@s.whatsapp.net",
        messageid: "wamid.media",
        fromMe: false,
        message: {
          image: {
            url: "https://cdn.example.com/file.jpg",
            mimetype: "image/jpeg",
            caption: "Segue comprovante"
          }
        }
      }
    });

    expect(result.kind).toBe("message");
    expect(result.payload?.message).toEqual({
      type: "image",
      text: "Segue comprovante",
      caption: "Segue comprovante",
      media: {
        url: "https://cdn.example.com/file.jpg",
        mimetype: "image/jpeg"
      }
    });
  });

  it("transforma eventos de atualização em atualização de status", () => {
    const result = parseUazapiWebhookPayload({
      event: "messages_update",
      data: {
        messageid: "wamid.status",
        status: "read"
      }
    });

    expect(result).toEqual({
      kind: "message_update",
      statusUpdate: {
        waMessageId: "wamid.status",
        status: "read"
      }
    });
  });

  it("ignora eventos sem mensagem identificável", () => {
    const result = parseUazapiWebhookPayload({ event: "connection", data: { status: "connected" } });
    expect(result.kind).toBe("ignored");
  });
});
