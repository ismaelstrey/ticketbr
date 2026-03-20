import { NextRequest, NextResponse } from "next/server";
import { chatService } from "@/server/services/chat-service";
import { logWebhookRequest } from "@/server/services/webhook-request-logs";

export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    body = await req.json();
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
    } else if (body && typeof body === "object") {
      // Verifica se é um objeto único que contém raw.body.data (caso do log do usuário)
      const messageData = body.raw?.body?.data;
      
      if (messageData && messageData.key) {
         const messageContent = messageData.message?.conversation || 
                                messageData.message?.extendedTextMessage?.text || 
                                messageData.message?.imageMessage?.caption || 
                                "";
         
         const messageType = messageData.messageType || "text";
         
         payload = {
           provider: body.provider || "evolution",
           mode: body.mode || "baileys",
           event: body.event || "message",
           instance: body.instance || "default",
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
           raw: body
         };
      } else {
        // Formato padrão esperado (objeto único sem aninhamento raw.body.data)
        payload = body;
      }
    } else {
      payload = body;
    }

    console.log("Received inbound message:", JSON.stringify(payload, null, 2));

    if (!payload?.wa_chat_id || !payload?.wa_message_id) {
      logWebhookRequest({ request: req, payload, route: "chat.inbound", source: String(payload?.provider || "webhook"), status: 400 });
      return NextResponse.json(
        { error: "Invalid payload: wa_chat_id or wa_message_id missing" },
        { status: 400 }
      );
    }

    const response = await chatService.processInboundMessage(payload);
    logWebhookRequest({ request: req, payload, route: "chat.inbound", source: String(payload?.provider || "webhook"), status: 200 });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error processing inbound message:", error);
    logWebhookRequest({ request: req, payload: body, route: "chat.inbound", source: "webhook", status: 500 });
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
