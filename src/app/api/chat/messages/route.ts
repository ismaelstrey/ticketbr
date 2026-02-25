import { NextRequest, NextResponse } from "next/server";
import { appendMessage, listMessages } from "@/server/services/chat-memory";
import { evolutionIsConfigured, fetchMessagesFromEvolution, sendMediaToEvolution, sendTextToEvolution } from "@/server/services/evolution-service";
import { getWhatsAppConfigFromRequest } from "@/server/services/whatsapp-settings";
import { emitChatEventToN8n } from "@/server/services/n8n-adapter";

function normalizePhone(input?: string) {
  return (input ?? "").replace(/\D/g, "");
}

export async function GET(request: NextRequest) {
  const contactId = request.nextUrl.searchParams.get("contactId") ?? "";
  const channel = (request.nextUrl.searchParams.get("channel") ?? "whatsapp") as "whatsapp" | "email";
  const contactPhone = normalizePhone(request.nextUrl.searchParams.get("contactPhone") ?? "");

  try {
    const config = getWhatsAppConfigFromRequest(request);
    const localMessages = listMessages(contactId, channel);

    if (channel === "whatsapp" && contactPhone && evolutionIsConfigured(config)) {
      const evolutionMessages = await fetchMessagesFromEvolution(contactPhone, config).catch((error) => {
        console.warn("Evolution fetch messages failed", error);
        return [];
      });

      const remoteMapped = evolutionMessages.map((msg) => ({
        id: msg.id,
        contactId,
        channel,
        direction: msg.direction,
        text: msg.text,
        createdAt: msg.createdAt
      }));

      const merged = [...remoteMapped, ...localMessages];
      const unique = new Map<string, (typeof merged)[number]>();
      merged.forEach((m) => unique.set(m.id, m));

      return NextResponse.json({ data: Array.from(unique.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) });
    }

    return NextResponse.json({ data: localMessages });
  } catch (error) {
    console.error("Error listing messages", error);
    return NextResponse.json({ error: "Erro ao carregar mensagens" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const channel = (body?.channel ?? "whatsapp") as "whatsapp" | "email";

    if (!body?.contactId) {
      return NextResponse.json({ error: "contactId é obrigatório" }, { status: 400 });
    }

    const config = getWhatsAppConfigFromRequest(request);

    const message = {
      id: crypto.randomUUID(),
      contactId: body.contactId,
      channel,
      direction: "out" as const,
      text: body.text,
      attachment: body.attachment,
      createdAt: new Date().toISOString()
    };

    if (channel === "whatsapp" && body.contactPhone && evolutionIsConfigured(config)) {
      const phone = normalizePhone(body.contactPhone);
      if (body.attachment?.data && body.attachment?.name && body.attachment?.mimeType) {
        await sendMediaToEvolution({
          number: phone,
          caption: body.text,
          fileName: body.attachment.name,
          mimeType: body.attachment.mimeType,
          media: body.attachment.data
        }, config);
      } else if (body.text?.trim()) {
        await sendTextToEvolution(phone, body.text, config);
      }
    }

    appendMessage(message);

    await emitChatEventToN8n(
      {
        type: "chat.message.sent",
        source: "ticketbr-chat",
        occurredAt: new Date().toISOString(),
        data: message as unknown as Record<string, unknown>
      },
      config
    );

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error: any) {
    console.error("Error sending message", error);
    return NextResponse.json({ error: error?.message ?? "Erro ao enviar mensagem" }, { status: 500 });
  }
}
