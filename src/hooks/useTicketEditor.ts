import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { Ticket } from "@/types/ticket";

export function useTicketEditor(
  tickets: Ticket[],
  setTickets: Dispatch<SetStateAction<Ticket[]>>,
  initialSelectedTicketId?: string | null
) {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialSelectedTicketId ?? null);

  useEffect(() => {
    if (initialSelectedTicketId === undefined) return;
    if (initialSelectedTicketId === selectedTicketId) return;
    setSelectedTicketId(initialSelectedTicketId ?? null);
  }, [initialSelectedTicketId, selectedTicketId]);

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
    setSelectedTicketId,
    openTicket,
    closeTicket,
    updateSelectedTicket
  };
}
