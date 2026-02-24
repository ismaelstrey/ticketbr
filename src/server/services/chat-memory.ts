import { ChatMessage } from "@/types/chat";

const memory = {
  messages: [] as ChatMessage[]
};

export function listMessages(contactId: string, channel: ChatMessage["channel"]) {
  return memory.messages
    .filter((m) => m.contactId === contactId && m.channel === channel)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function appendMessage(message: ChatMessage) {
  memory.messages.push(message);
}
