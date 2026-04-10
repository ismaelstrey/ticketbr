import { DragEvent, useMemo, useState, useEffect, useCallback } from "react";
import { Ticket, TicketStatus } from "@/types/ticket";
import { api } from "@/services/api";
import { useToast } from "@/context/ToastContext";
import { APICache } from "@/lib/api-cache";
import { perfMonitor } from "@/lib/performanceMonitor";

const TICKET_ID_MIME = "application/x-ticket-id";
const CACHE_KEY = "kanban_tickets";

function getTransferTicketId(event: DragEvent<HTMLElement>, fallback: string | null) {
  const transferredId = event.dataTransfer.getData(TICKET_ID_MIME) || event.dataTransfer.getData("text/plain");
  return !transferredId ? fallback : transferredId;
}

export function useTicketDragDrop() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchTickets = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const startCache = performance.now();
        const cached = APICache.get<Ticket[]>(CACHE_KEY);
        if (cached) {
          setTickets(cached);
          setLoading(false);
          const duration = performance.now() - startCache;
          perfMonitor.trackAPICall("/api/tickets", duration, true, true);
          return;
        }
      }

      setLoading(true);
      const start = performance.now();
      const response = await api.tickets.list();
      
      const duration = performance.now() - start;
      perfMonitor.trackAPICall("/api/tickets", duration, true, false);

      if (Array.isArray(response.data)) {
        setTickets(response.data);
        APICache.set(CACHE_KEY, response.data);
        setLoadError(null);
      }
      
    } catch (err) {
      console.error("Failed to load tickets", err);
      perfMonitor.trackAPICall("/api/tickets", 0, false, false);
      setLoadError("Não foi possível carregar tickets do servidor.");
      showToast("Não foi possível carregar tickets do servidor.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TicketStatus | null>(null);
  const [pauseModalTicketId, setPauseModalTicketId] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseSla, setPauseSla] = useState(false);

  const pauseModalTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === pauseModalTicketId) ?? null,
    [tickets, pauseModalTicketId]
  );

  const updateTicketStatus = (ticketId: string, targetStatus: TicketStatus, reason?: string, pauseSlaFlag?: boolean) => {
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
          pauseReason: targetStatus === "paused" ? reason ?? ticket.pauseReason ?? "" : undefined,
          pauseSla: targetStatus === "paused" ? Boolean(pauseSlaFlag) : false
        };
      })
    );

    // Call API (Background)
    api.tickets.updateStatus(ticketId, targetStatus, reason, pauseSlaFlag)
      .then((response) => {
        if (response?.data) {
          setTickets((current) => {
            const next = current.map((ticket) => (ticket.id === ticketId ? response.data : ticket));
            APICache.set(CACHE_KEY, next); // Selective invalidation (updates the cache with the mutated array)
            return next;
          });
        }
        showToast("Status do ticket atualizado com sucesso.", "success");
      })
      .catch((err) => {
        console.error(`Failed to update ticket ${ticketId}`, err);
        setTickets(previousTickets);
        APICache.set(CACHE_KEY, previousTickets); // Revert cache
        showToast("Erro ao atualizar o status do ticket.", "error");
      });
  };

  const closePauseModal = () => {
    setPauseModalTicketId(null);
    setPauseReason("");
    setPauseSla(false);
  };

  const confirmPause = () => {
    if (pauseModalTicketId == null) {
      return;
    }

    updateTicketStatus(pauseModalTicketId, "paused", pauseReason.trim(), pauseSla);
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
      setPauseSla(false);
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
    loadError,
    refreshTickets: fetchTickets,
    draggingTicketId,
    dragOverColumn,
    pauseModalTicket,
    pauseReason,
    setPauseReason,
    pauseSla,
    setPauseSla,
    closePauseModal,
    confirmPause,
    onTicketDragStart,
    onTicketDragEnd,
    onColumnDragOver,
    onColumnDrop,
    setDragOverColumn
  };
}
