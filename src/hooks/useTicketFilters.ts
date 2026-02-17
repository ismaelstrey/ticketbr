import { useMemo, useState } from "react";
import { Ticket, TicketPriority, TicketStatus } from "@/types/ticket";

export function useTicketFilters(tickets: Ticket[]) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"all" | TicketPriority>("all");
  const [status, setStatus] = useState<"all" | TicketStatus>("all");

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const haystack = `${ticket.id} ${ticket.empresa} ${ticket.solicitante} ${ticket.assunto}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesPriority = priority === "all" || ticket.prioridade === priority;
      const matchesStatus = status === "all" || ticket.status === status;

      return matchesQuery && matchesPriority && matchesStatus;
    });
  }, [tickets, query, priority, status]);

  const totalOpen = filteredTickets.filter((ticket) => ticket.status !== "done").length;
  const avgSla =
    filteredTickets.length === 0
      ? 0
      : Math.round(filteredTickets.reduce((acc, ticket) => acc + ticket.progressoSla, 0) / filteredTickets.length);

  return {
    filteredTickets,
    query,
    setQuery,
    priority,
    setPriority,
    status,
    setStatus,
    totalOpen,
    avgSla
  };
}
