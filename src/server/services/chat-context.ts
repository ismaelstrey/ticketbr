import { prisma } from "@/lib/prisma";

export interface ConversationContextMessage {
  id: string;
  direction: string;
  type: string;
  body: string | null;
  status: string;
  createdAt: string;
}

export interface ConversationContext {
  conversationId: string;
  waChatId: string;
  instance: string | null;
  status: string;
  botActive: boolean;
  humanActive: boolean;
  assignedTo: string | null;
  lastMessageAt: string | null;
  recentMessages: ConversationContextMessage[];
}

export async function buildConversationContext(conversationId: string, options?: { recentLimit?: number }): Promise<ConversationContext> {
  const recentLimit = Math.max(1, Math.min(options?.recentLimit ?? 10, 50));

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      messages: {
        take: recentLimit,
        orderBy: { createdAt: "desc" }
      }
    }
  });

  return {
    conversationId: conversation.id,
    waChatId: conversation.waChatId,
    instance: conversation.instance ?? null,
    status: conversation.status,
    botActive: conversation.botActive,
    humanActive: conversation.humanActive,
    assignedTo: conversation.assignedTo ?? null,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    recentMessages: [...conversation.messages]
      .reverse()
      .map((message) => ({
        id: message.id,
        direction: message.direction,
        type: message.type,
        body: message.body,
        status: message.status,
        createdAt: message.createdAt.toISOString()
      }))
  };
}
