import { DragEvent, useMemo, useState, useEffect } from "react";
import { Ticket, TicketStatus } from "@/types/ticket";
import { api } from "@/services/api";
import { useToast } from "@/context/ToastContext";

const TICKET_ID_MIME = "application/x-ticket-id";

function getTransferTicketId(event: DragEvent<HTMLElement>, fallback: string | null) {
  const transferredId = event.dataTransfer.getData(TICKET_ID_MIME) || event.dataTransfer.getData("text/plain");
  return !transferredId ? fallback : transferredId;
}

export function useTicketDragDrop(initialTickets: Ticket[]) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets ?? []);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/tickets")
      .then((res) => res.json())
      .then((data) => {
          if (data.data) {
              setTickets(data.data);
          }
      })
      .catch((err) => {
        console.error("Failed to load tickets", err);
        showToast("Não foi possível carregar tickets do servidor.", "error");
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TicketStatus | null>(null);
  const [pauseModalTicketId, setPauseModalTicketId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState("");

  const pauseModalTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === pauseModalTicketId) ?? null,
    [tickets, pauseModalTicketId]
  );

  const updateTicketStatus = (ticketId: string, targetStatus: TicketStatus, reason?: string) => {
    const previousTickets = tickets;

    // Optimistic update
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

    // Call API (Background)
    api.tickets.updateStatus(ticketId, targetStatus, reason)
      .then((response) => {
        if (response?.data) {
          setTickets((current) => current.map((ticket) => (ticket.id === ticketId ? response.data : ticket)));
        }
        showToast("Status do ticket atualizado com sucesso.", "success");
      })
      .catch((err) => {
        console.error(`Failed to update ticket ${ticketId}`, err);
        setTickets(previousTickets);
        showToast("Erro ao atualizar o status do ticket.", "error");
      });
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

  const onTicketDragStart = (event: DragEvent<HTMLElement>, ticketId: string) => {
    setDraggingTicketId(ticketId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(TICKET_ID_MIME, ticketId);
    event.dataTransfer.setData("text/plain", ticketId);
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
    loading,
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
