import { describe, expect, it } from "vitest";
import { normalizeInboundPayload } from "./chat-inbound-normalizer";

describe("normalizeInboundPayload", () => {
  it("normaliza o payload legado do inbound vindo do n8n/evolution", () => {
    const result = normalizeInboundPayload([
      {
        provider: "evolution",
        raw: {
          body: {
            data: {
              key: {
                remoteJid: "5511999999999@s.whatsapp.net",
                id: "wamid.legacy",
                fromMe: false
              },
              pushName: "Cliente legado",
              messageTimestamp: 1710000000,
              messageType: "text",
              message: {
                conversation: "preciso de suporte"
              }
            }
          }
        }
      }
    ]);

    expect(result).toMatchObject({
      kind: "message",
      source: "evolution",
      payload: {
        wa_chat_id: "5511999999999@s.whatsapp.net",
        wa_message_id: "wamid.legacy",
        pushName: "Cliente legado",
        message: {
          type: "text",
          text: "preciso de suporte"
        }
      }
    });
  });

  it("reaproveita o parser canônico da UAZAPI", () => {
    const result = normalizeInboundPayload({
      EventType: "messages_update",
      data: {
        messageid: "wamid.status",
        status: "read"
      }
    });

    expect(result).toEqual({
      kind: "message_update",
      source: "uazapi",
      statusUpdate: {
        waMessageId: "wamid.status",
        status: "read"
      }
    });
  });
});
