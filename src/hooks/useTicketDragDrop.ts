import { DragEvent, useMemo, useState } from "react";
import { Ticket, TicketStatus } from "@/types/ticket";

const TICKET_ID_MIME = "application/x-ticket-id";

function getTransferTicketId(event: DragEvent<HTMLElement>, fallback: number | null) {
  const transferredId = Number(event.dataTransfer.getData(TICKET_ID_MIME) || event.dataTransfer.getData("text/plain"));
  return Number.isNaN(transferredId) ? fallback : transferredId;
}

export function useTicketDragDrop(initialTickets: Ticket[]) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [draggingTicketId, setDraggingTicketId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TicketStatus | null>(null);
  const [pauseModalTicketId, setPauseModalTicketId] = useState<number | null>(null);
  const [pauseReason, setPauseReason] = useState("");

  const pauseModalTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === pauseModalTicketId) ?? null,
    [tickets, pauseModalTicketId]
  );

  const updateTicketStatus = (ticketId: number, targetStatus: TicketStatus, reason?: string) => {
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== ticketId) {
          return ticket;
        }

        return {
          ...ticket,
          status: targetStatus,
          pauseReason: targetStatus === "paused" ? reason ?? ticket.pauseReason ?? "" : undefined
        };
      })
    );
  };

  const closePauseModal = () => {
    setPauseModalTicketId(null);
    setPauseReason("");
  };

  const confirmPause = () => {
    if (pauseModalTicketId == null) {
      return;
    }

    updateTicketStatus(pauseModalTicketId, "paused", pauseReason.trim());
    closePauseModal();
  };

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
    const sourceId = getTransferTicketId(event, draggingTicketId);

    if (sourceId == null) {
      setDragOverColumn(null);
      return;
    }

    if (targetStatus === "paused") {
      setPauseModalTicketId(sourceId);
      setPauseReason("");
    } else {
      updateTicketStatus(sourceId, targetStatus);
    }

    setDraggingTicketId(null);
    setDragOverColumn(null);
  };

  return {
    tickets,
    setTickets,
    draggingTicketId,
    dragOverColumn,
    pauseModalTicket,
    pauseReason,
    setPauseReason,
    closePauseModal,
    confirmPause,
    onTicketDragStart,
    onTicketDragEnd,
    onColumnDragOver,
    onColumnDrop,
    setDragOverColumn
  };
}
