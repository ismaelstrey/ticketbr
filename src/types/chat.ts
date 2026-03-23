export type ChatChannel = "whatsapp" | "email";

export interface ChatContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  companyId?: string;
  tags?: string[];
  hasWhatsApp?: boolean;
  conversationId?: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
}

export interface ChatAttachment {
  name: string;
  mimeType: string;
  data?: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  contactId: string;
  channel: ChatChannel;
  direction: "in" | "out";
  text?: string;
  attachment?: ChatAttachment;
  createdAt: string;
}

export interface ChatTicketLink {
  id: string;
  ticketId: string;
  ticketNumber: number;
  ticketSubject: string;
  contactId: string;
  channel: ChatChannel;
  conversationId: string;
  createdAt: string;
  author?: string;
}


export interface ArchivedChatConversation {
  id: string;
  contactId: string;
  contactName: string;
  channel: ChatChannel;
  conversationId: string;
  ticketId?: string | null;
  ticket?: { id: string; number: number; subject: string } | null;
  messages: ChatMessage[];
  closedAt: string;
  nextStartedAt?: string | null;
  createdBy?: string | null;
}
