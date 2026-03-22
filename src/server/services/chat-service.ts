import { prisma } from "@/lib/prisma";
import { buildConversationContext } from "@/server/services/chat-context";

export interface ChatAction {
  type: "typing_start" | "typing_stop" | "mark_read" | "send";
  duration_ms?: number;
  wa_message_id?: string;
  message?: {
    type: "text" | "image" | "audio" | "video" | "document";
    text?: string;
    caption?: string;
    media_url?: string;
    mimetype?: string;
    fileName?: string;
    mediatype?: string;
    delay?: number;
    linkPreview?: boolean;
    quoted_wa_message_id?: string;
  };
}

export interface ChatResponse {
  mode: "bot" | "human" | "hybrid";
  handoff: {
    required: boolean;
    reason: string | null;
  };
  routing: {
    queue: string;
    priority: string;
    assignee: string | null;
  };
  actions: ChatAction[];
  suggestions: Array<{ text: string }>;
}

export interface InboundPayload {
  provider: string;
  mode: string;
  event: string;
  instance: string;
  wa_chat_id: string;
  wa_message_id: string;
  fromMe: boolean;
  pushName: string | null;
  timestamp: number | null;
  message: {
    type: string;
    text: string | null;
    caption: string | null;
    media: {
      url: string;
      mimetype: string;
    } | null;
  };
  raw: any;
}

export class ChatService {
  async findOrCreateConversation(waChatId: string, instance?: string) {
    let conversation = await prisma.conversation.findUnique({
      where: { waChatId },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          waChatId,
          instance,
          status: "open",
          botActive: true,
          humanActive: false,
        },
      });
    }

    return conversation;
  }

  async saveMessage(data: {
    waMessageId: string;
    conversationId: string;
    direction: "in" | "out";
    type: string;
    body: string | null;
    mediaUrl: string | null;
    mimetype: string | null;
    status: string;
  }) {
    // Upsert to avoid duplicates
    return prisma.message.upsert({
      where: { waMessageId: data.waMessageId },
      update: {
        status: data.status,
        mediaUrl: data.mediaUrl, // Update stable URL if changed
      },
      create: {
        waMessageId: data.waMessageId,
        conversationId: data.conversationId,
        direction: data.direction,
        type: data.type,
        body: data.body,
        mediaUrl: data.mediaUrl,
        mimetype: data.mimetype,
        status: data.status,
      },
    });
  }

  async updateMessageStatus(waMessageId: string, status: string) {
    try {
      await prisma.message.update({
        where: { waMessageId },
        data: { status },
      });
    } catch (error) {
      // Ignore if message not found (might be ephemeral or old)
      console.warn(`Failed to update message status ${waMessageId}:`, error);
    }
  }

  async processInboundMessage(payload: InboundPayload): Promise<ChatResponse> {
    const { wa_chat_id, wa_message_id, message, instance } = payload;

    // 1. Find or create conversation
    const conversation = await this.findOrCreateConversation(wa_chat_id, instance);

    // 2. Save inbound message
    await this.saveMessage({
      waMessageId: wa_message_id,
      conversationId: conversation.id,
      direction: "in",
      type: message.type,
      body: message.text || message.caption,
      mediaUrl: message.media?.url || null,
      mimetype: message.media?.mimetype || null,
      status: "delivered",
    });

    // 3. Update conversation last message
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    const context = await buildConversationContext(conversation.id);

    // 4. Decide response (Hybrid Logic)
    const actions: ChatAction[] = [];
    const suggestions: Array<{ text: string }> = [];
    let mode: "bot" | "human" | "hybrid" = "hybrid";
    let handoffRequired = false;

    // Default: Mark as read
    actions.push({ type: "mark_read", wa_message_id });

    // Logic: If bot is active and no human is assigned, bot can respond
    if (context.botActive && !context.humanActive) {
      // Simple echo bot logic for demonstration (replace with actual AI logic)
      // In a real scenario, you'd call an AI service here.
      
      // Simulate processing time
      actions.push({ type: "typing_start", duration_ms: 1000 });
      
      // Example response
      /*
      actions.push({
        type: "send",
        message: {
          type: "text",
          text: "Olá! Recebi sua mensagem. Como posso ajudar?",
          quoted_wa_message_id: wa_message_id
        }
      });
      */
     
      actions.push({ type: "typing_stop" });
      
      mode = "bot";
    } else {
      mode = "human";
      // If human is active, maybe suggest replies to the agent
      suggestions.push({ text: "Olá, como posso ajudar?" });
    }

    return {
      mode,
      handoff: {
        required: handoffRequired,
        reason: null,
      },
      routing: {
        queue: "default",
        priority: "normal",
        assignee: context.assignedTo,
      },
      actions,
      suggestions,
    };
  }

  async getMessages(conversationId: string) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  }
  
  async listConversations() {
      return prisma.conversation.findMany({
          orderBy: { lastMessageAt: 'desc' },
          include: {
              messages: {
                  take: 1,
                  orderBy: { createdAt: 'desc' }
              }
          }
      })
  }
}

export const chatService = new ChatService();
