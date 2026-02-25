import { useMemo, useState } from "react";
import { Ticket, TicketPriority, TicketStatus } from "@/types/ticket";
import { getSlaTone } from "@/lib/sla";

export function useTicketFilters(tickets: Ticket[]) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"all" | TicketPriority>("all");
  const [status, setStatus] = useState<"all" | TicketStatus>("all");

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const haystack = `${ticket.number} ${ticket.empresa} ${ticket.solicitante} ${ticket.assunto}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesPriority = priority === "all" || ticket.prioridade === priority;
      const matchesStatus = status === "all" || ticket.status === status;

      return matchesQuery && matchesPriority && matchesStatus;
    });
  }, [tickets, query, priority, status]);

  const openTickets = filteredTickets.filter((ticket) => ticket.status !== "done");
  const totalOpen = openTickets.length;

  const avgSla =
    openTickets.length === 0
      ? 0
      : Math.round(openTickets.reduce((acc, ticket) => acc + ticket.progressoSla, 0) / openTickets.length);

  const atRiskCount = openTickets.filter((ticket) => {
    const tone = getSlaTone(ticket.progressoSla);
    return tone === "warning" || tone === "danger" || tone === "breach";
  }).length;

  return {
    filteredTickets,
    query,
    setQuery,
    priority,
    setPriority,
    status,
    setStatus,
    totalOpen,
    avgSla,
    atRiskCount
  };
}
