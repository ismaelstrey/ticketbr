import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/server/services/chat-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let payload: any; // Usando any temporariamente para a construção manual

    // Adaptação para o formato de array enviado pelo N8N
    if (Array.isArray(body) && body.length > 0) {
      const rawItem = body[0];
      // Verifica se a estrutura bate com o log enviado: raw -> body -> data
      const messageData = rawItem.raw?.body?.data;
      
      if (messageData && messageData.key) {
        const messageContent = messageData.message?.conversation || 
                               messageData.message?.extendedTextMessage?.text || 
                               messageData.message?.imageMessage?.caption || 
                               "";
        
        const messageType = messageData.messageType || "text";
        
        payload = {
          provider: rawItem.provider || "evolution",
          mode: rawItem.mode || "baileys",
          event: rawItem.event || "message",
          instance: rawItem.instance || "default",
          wa_chat_id: messageData.key.remoteJid,
          wa_message_id: messageData.key.id,
          fromMe: messageData.key.fromMe,
          pushName: messageData.pushName,
          timestamp: messageData.messageTimestamp,
          message: {
            type: messageType,
            text: messageContent,
            caption: null,
            media: null
          },
          raw: rawItem
        };
      } else {
         // Se for array mas não tiver a estrutura esperada, tenta usar como se fosse o payload direto
         payload = rawItem;
      }
    } else {
      // Formato padrão esperado (objeto único)
      payload = body;
    }

    console.log("Received inbound message:", JSON.stringify(payload, null, 2));

    if (!payload?.wa_chat_id || !payload?.wa_message_id) {
      return NextResponse.json(
        { error: "Invalid payload: wa_chat_id or wa_message_id missing" },
        { status: 400 }
      );
    }

    const response = await chatService.processInboundMessage(payload);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error processing inbound message:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
