import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Ticket } from "@/types/ticket";

export function useTicketEditor(tickets: Ticket[], setTickets: Dispatch<SetStateAction<Ticket[]>>) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId]
  );

  const openTicket = (ticketId: string) => setSelectedTicketId(ticketId);
  const closeTicket = () => setSelectedTicketId(null);

  const updateSelectedTicket = (changes: Partial<Ticket>) => {
    if (selectedTicketId == null) {
      return;
    }

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicketId
          ? {
              ...ticket,
              ...changes
            }
          : ticket
      )
    );
  };

  return {
    selectedTicket,
    selectedTicketId,
    openTicket,
    closeTicket,
    updateSelectedTicket
  };
}
