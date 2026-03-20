import { NextRequest, NextResponse } from "next/server";
import { appendMessage } from "@/server/services/chat-memory";
import { chatService } from "@/server/services/chat-service";
import { emitChatEventToN8n } from "@/server/services/n8n-adapter";
import { parseUazapiWebhookPayload } from "@/server/services/uazapi-webhook";
import { logWebhookRequest } from "@/server/services/webhook-request-logs";

async function processInboundWebhook(payload: unknown) {
  const parsed = parseUazapiWebhookPayload(payload);

  if (parsed.kind === "message_update" && parsed.statusUpdate) {
    await chatService.updateMessageStatus(parsed.statusUpdate.waMessageId, parsed.statusUpdate.status);
    return { ok: true, kind: parsed.kind };
  }

  if (parsed.kind === "ignored" || !parsed.payload) {
    return { ok: true, ignored: true, reason: parsed.reason ?? "ignored" };
  }

  await chatService.processInboundMessage(parsed.payload);

  if (!parsed.payload.fromMe) {
    appendMessage({
      id: crypto.randomUUID(),
      contactId: parsed.payload.wa_chat_id,
      channel: "whatsapp",
      direction: "in",
      text: parsed.payload.message.text || parsed.payload.message.caption || "Mensagem recebida",
      createdAt: new Date().toISOString(),
      attachment: parsed.payload.message.media?.url
        ? {
            url: parsed.payload.message.media.url,
            mimeType: parsed.payload.message.media.mimetype,
            name: parsed.payload.message.type
          }
        : undefined
    });
  }

  await emitChatEventToN8n({
    type: "chat.message.received",
    source: "ticketbr-chat",
    occurredAt: new Date().toISOString(),
    data: parsed.payload as unknown as Record<string, unknown>
  });

  return { ok: true, kind: parsed.kind };
}

export async function POST(request: NextRequest) {
  let payload: unknown = null;
  try {
    payload = await request.json();
    const response = await processInboundWebhook(payload);
    logWebhookRequest({ request, payload, route: "chat.webhook", source: "uazapi", status: 200 });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error on chat webhook", error);
    logWebhookRequest({ request, payload, route: "chat.webhook", source: "uazapi", status: 400 });
    return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });
  }
}

export { processInboundWebhook };
