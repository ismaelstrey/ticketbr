import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/server/services/chat-service";
import { resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";
import { isN8nConfigured, sendMessageToN8n } from "@/server/services/n8n-adapter";
import { evolutionIsConfigured, sendTextToEvolution, sendMediaToEvolution } from "@/server/services/evolution-service";

function normalizePhone(input?: string) {
  return (input ?? "").replace(/\D/g, "");
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
    const { contactId, text, attachment } = body; // contactId aqui é o JID (wa_chat_id)

    if (!contactId) {
      return NextResponse.json({ error: "contactId (JID) é obrigatório" }, { status: 400 });
    }

    const config = await resolveWhatsAppConfig(request);
    const waMessageId = `out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const n8nEnabled = isN8nConfigured(config);
    const evolutionEnabled = evolutionIsConfigured(config);

    if (!n8nEnabled && !evolutionEnabled) {
      return NextResponse.json({ error: "WhatsApp não está configurado" }, { status: 400 });
    }

    if (n8nEnabled) {
      try {
        await sendMessageToN8n({
          number: contactId,
          type: attachment ? "media" : "text",
          text,
          media: attachment,
          idempotency_key: waMessageId,
        }, config);
      } catch (error: any) {
        return NextResponse.json({ error: error?.message ?? "Falha ao enviar para N8N" }, { status: 502 });
      }
    } else if (evolutionEnabled) {
      const phone = normalizePhone(contactId);
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
    } else {
      return NextResponse.json({ error: "WhatsApp não está configurado" }, { status: 400 });
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
