"use client";

import { useCallback, useEffect, useState } from "react";

export type NotificationItem = {
  id: string;
  tipo: string;
  title: string;
  body: string | null;
  link: string | null;
  ticketId: string | null;
  readAt: string | null;
  createdAt: string;
};

type UseNotificationsOptions = {
  limit?: number;
  // Intervalo de atualização automática do sino (em ms). 0 desativa o polling.
  pollMs?: number;
};

/**
 * Hook de acesso à API de notificações: lista, contagem de não lidas,
 * marcação de leitura e atualização periódica do sino.
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { limit = 20, pollMs = 60000 } = options;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Busca as notificações mais recentes do usuário autenticado
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?limit=${limit}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const data = json?.data ?? {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setUnreadCount(Number(data.unreadCount) || 0);
    } catch (error) {
      console.warn("[useNotifications] falha ao carregar notificações", error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Marca uma notificação como lida (otimista, com recarregamento em caso de falha)
  const markRead = useCallback(
    async (id: string) => {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
      setUnreadCount((prev) => Math.max(prev - 1, 0));
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
        if (!res.ok) throw new Error("Falha ao marcar como lida");
      } catch (error) {
        console.warn("[useNotifications] falha ao marcar notificação como lida", error);
        await refresh();
      }
    },
    [refresh]
  );

  // Marca todas as notificações do usuário como lidas
  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true })
      });
      if (!res.ok) throw new Error("Falha ao marcar todas como lidas");
    } catch (error) {
      console.warn("[useNotifications] falha ao marcar todas as notificações como lidas", error);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!pollMs || pollMs <= 0) return;
    const timer = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(timer);
  }, [pollMs, refresh]);

  return { items, unreadCount, loading, refresh, markRead, markAllRead };
}
