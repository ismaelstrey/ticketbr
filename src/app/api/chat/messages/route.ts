import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/server/services/chat-service";
import { resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";
import { sendMessageToN8n } from "@/server/services/n8n-adapter";
import { sendTextToEvolution, sendMediaToEvolution } from "@/server/services/evolution-service";
import { sendMediaToUazapi, sendTextToUazapi } from "@/server/services/uazapi-service";
import { getAvailableWhatsAppProviders, resolveWhatsAppProvider } from "@/server/services/chat-provider";

function normalizePhone(input?: string) {
  return (input ?? "").replace(/\D/g, "");
}

function maskPhone(value?: string) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 2)}••••${digits.slice(-2)}`;
}

export async function GET(request: NextRequest) {
  try {
    const contactId = request.nextUrl.searchParams.get("contactId");
    
    // Se contactId for um número de telefone (JID), tentamos achar a conversa
    if (!contactId) {
      return NextResponse.json({ data: [] });
    }

    // Tenta achar conversa pelo JID (contactId pode ser o JID ou UUID da conversa)
    // Assumindo que o frontend passa o JID ou ID da conversa.
    // Se for JID (contém @), busca por waChatId.
    let conversation;
    if (contactId.includes("@")) {
       conversation = await chatService.findOrCreateConversation(contactId);
    } else {
       // Se for ID interno, precisaria buscar pelo ID.
       // Por simplicidade, vamos assumir que o frontend passa o JID por enquanto ou implementamos busca por ID.
       // Vamos assumir JID.
       conversation = await chatService.findOrCreateConversation(contactId);
    }

    const messages = await chatService.getMessages(conversation.id);

    // Mapear para o formato esperado pelo frontend
    const mappedMessages = messages.map(msg => ({
      id: msg.id,
      contactId: conversation.waChatId, // ou conversation.id
      channel: "whatsapp",
      direction: msg.direction,
      text: msg.body,
      attachment: msg.mediaUrl ? {
          url: msg.mediaUrl,
          mimeType: msg.mimetype,
          name: "Mídia"
      } : undefined,
      type: msg.type,
      status: msg.status,
      createdAt: msg.createdAt.toISOString()
    }));

    return NextResponse.json({ data: mappedMessages });
  } catch (error: any) {
    console.error("Error listing messages:", error);
    return NextResponse.json({ error: "Erro ao listar mensagens" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, text, attachment, contactPhone } = body; // contactId aqui é o JID (wa_chat_id)

    if (!contactId) {
      return NextResponse.json({ error: "contactId (JID) é obrigatório" }, { status: 400 });
    }

    const config = await resolveWhatsAppConfig(request);
    const waMessageId = `out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const availableProviders = getAvailableWhatsAppProviders(config);

    if (!availableProviders.n8n && !availableProviders.evolution && !availableProviders.uazapi) {
      return NextResponse.json({ error: "WhatsApp não está configurado" }, { status: 400 });
    }

    // Resolve o número de telefone correto
    // Se contactPhone vier no body, usa ele.
    // Se contactId contiver @, é um JID, então extrai o número dele.
    let targetPhone = contactPhone;
    if (!targetPhone && contactId.includes("@")) {
      targetPhone = contactId.split("@")[0];
    } else if (!targetPhone) {
        // Se ainda não tivermos o telefone e o contactId não for JID, assumimos que é o ID interno
        // e tentamos limpar caracteres não numéricos se parecer um telefone
        targetPhone = normalizePhone(contactId);
    }

    const provider = resolveWhatsAppProvider(config, ["n8n", "evolution", "uazapi"]);
    const debug = process.env.CHAT_ROUTING_DEBUG === "true";
    if (debug) {
      console.log("[chat-routing] outbound", {
        waMessageId,
        provider,
        configProvider: config?.whatsappProvider ?? null,
        providersEnabled: availableProviders,
        contactIdHasAt: String(contactId).includes("@"),
        targetPhone: maskPhone(targetPhone)
      });
    }

    if (provider === "n8n") {
      if (!availableProviders.n8n) return NextResponse.json({ error: "Provider n8n selecionado, mas não está configurado" }, { status: 400 });
      try {
        await sendMessageToN8n({
          number: targetPhone, // Usa o telefone resolvido
          type: attachment ? "media" : "text",
          text,
          media: attachment,
          idempotency_key: waMessageId,
        }, config);
      } catch (error: any) {
        return NextResponse.json({ error: error?.message ?? "Falha ao enviar para N8N" }, { status: 502 });
      }
    } else if (provider === "evolution") {
      if (!availableProviders.evolution) return NextResponse.json({ error: "Provider Evolution selecionado, mas não está configurado" }, { status: 400 });
      const phone = targetPhone || contactId;
      if (attachment) {
        await sendMediaToEvolution({
          number: phone,
          caption: text,
          media: attachment.data,
          mimeType: attachment.mimeType,
          fileName: attachment.name || "arquivo",
        }, config);
      } else {
        await sendTextToEvolution(phone, text || "", config);
      }
    } else if (provider === "uazapi") {
      if (!availableProviders.uazapi) return NextResponse.json({ error: "Provider UAZAPI selecionado, mas não está configurado" }, { status: 400 });
      const phone = targetPhone || "";
      if (!phone) return NextResponse.json({ error: "contactPhone é obrigatório para UAZAPI" }, { status: 400 });
      if (attachment) {
        const mime = String(attachment.mimeType || "").toLowerCase();
        const mediatype =
          mime.startsWith("image/") ? "image" :
          mime.startsWith("video/") ? "video" :
          mime.startsWith("audio/") ? "audio" :
          "document";
        await sendMediaToUazapi({
          number: phone,
          mediatype,
          caption: text,
          media: attachment.data,
          mimeType: attachment.mimeType,
          fileName: attachment.name || "arquivo"
        }, config);
      } else {
        await sendTextToUazapi({ number: phone, text: text || "" }, config);
      }
    } else {
      return NextResponse.json({ error: "Provider WhatsApp inválido" }, { status: 400 });
    }

    const shouldPersist = Boolean(process.env.DATABASE_URL);
    if (shouldPersist) {
      const conversation = await chatService.findOrCreateConversation(contactId);
      const savedMessage = await chatService.saveMessage({
        waMessageId,
        conversationId: conversation.id,
        direction: "out",
        type: attachment ? (attachment.type || "image") : "text",
        body: text,
        mediaUrl: null,
        mimetype: attachment?.mimeType || null,
        status: "sent",
      });

      return NextResponse.json(
        {
          data: {
            id: savedMessage.id,
            text: savedMessage.body,
            createdAt: savedMessage.createdAt,
            direction: "out",
            status: "sent",
          },
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        data: {
          id: waMessageId,
          text: text ?? null,
          createdAt: new Date().toISOString(),
          direction: "out",
          status: "sent",
        },
      },
      { status: 201 },
    );

  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
