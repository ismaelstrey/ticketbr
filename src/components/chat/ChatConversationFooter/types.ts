export interface ChatConversationFooterTicket {
  id: string;
  number: number;
  subject: string;
  priorityLabel?: string;
  slaLabel?: string;
}

export interface ChatConversationFooterArchivedConversation {
  id: string;
  closedAt: string;
  ticketNumber?: number | null;
}

export interface ChatConversationFooterProps {
  tickets: ChatConversationFooterTicket[];
  selectedTicketId: string;
  onSelectedTicketIdChange: (next: string) => void;
  onAssociate: () => void;
  associateDisabled?: boolean;

  showArchived: boolean;
  archivedConversations: ChatConversationFooterArchivedConversation[];
  activeArchivedId: string;
  onActiveArchivedIdChange: (next: string) => void;

  onFinalize: () => void;
  finalizeDisabled?: boolean;
  finalizeLabel?: string;
}
