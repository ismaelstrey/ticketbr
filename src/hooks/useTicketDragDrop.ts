import { DragEvent, useState } from "react";
import { Ticket, TicketStatus } from "@/types/ticket";

const TICKET_ID_MIME = "application/x-ticket-id";

export function useTicketDragDrop(initialTickets: Ticket[]) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [draggingTicketId, setDraggingTicketId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TicketStatus | null>(null);

  const onTicketDragStart = (event: DragEvent<HTMLElement>, ticketId: number) => {
    setDraggingTicketId(ticketId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(TICKET_ID_MIME, String(ticketId));
    event.dataTransfer.setData("text/plain", String(ticketId));
  };

  const onTicketDragEnd = () => {
    setDraggingTicketId(null);
    setDragOverColumn(null);
  };

  const onColumnDragOver = (event: DragEvent<HTMLElement>, column: TicketStatus) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== column) {
      setDragOverColumn(column);
    }
  };

  const onColumnDrop = (event: DragEvent<HTMLElement>, targetStatus: TicketStatus) => {
    event.preventDefault();

    const transferredId = Number(event.dataTransfer.getData(TICKET_ID_MIME) || event.dataTransfer.getData("text/plain"));
    const sourceId = Number.isNaN(transferredId) ? draggingTicketId : transferredId;

    if (sourceId == null) {
      setDragOverColumn(null);
      return;
    }

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === sourceId
          ? {
              ...ticket,
              status: targetStatus
            }
          : ticket
      )
    );

    setDraggingTicketId(null);
    setDragOverColumn(null);
  };

  return {
    tickets,
    setTickets,
    draggingTicketId,
    dragOverColumn,
    onTicketDragStart,
    onTicketDragEnd,
    onColumnDragOver,
    onColumnDrop,
    setDragOverColumn
  };
}
