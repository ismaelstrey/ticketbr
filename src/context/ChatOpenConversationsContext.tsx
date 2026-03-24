"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { ChatContact } from "@/types/chat";

const INVALIDATE_EVENT = "ticketbr:chat-open-conversations:invalidate";

function computeOpenCount(contacts: ChatContact[]) {
  return contacts.reduce((acc, c) => acc + (c.hasOpenConversation ? 1 : 0), 0);
}

type ChatOpenConversationsState = {
  openCount: number;
  loading: boolean;
  lastError: string | null;
  refresh: () => Promise<void>;
  optimisticAdjust: (delta: number) => void;
};

const ChatOpenConversationsContext = createContext<ChatOpenConversationsState | null>(null);

export function broadcastChatOpenConversationsInvalidation() {
  if (typeof window === "undefined") return;
  try {
    const bc = new BroadcastChannel(INVALIDATE_EVENT);
    bc.postMessage({ type: "invalidate" });
    bc.close();
    return;
  } catch {
    window.dispatchEvent(new Event(INVALIDATE_EVENT));
  }
}

export function ChatOpenConversationsProvider({
  children,
  pollIntervalMs = 10_000
}: {
  children: React.ReactNode;
  pollIntervalMs?: number;
}) {
  const { user, loading: authLoading } = useAuth();
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user || authLoading) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/chat/contacts", { cache: "no-store" });
      if (!res || typeof (res as any).ok !== "boolean") throw new Error("Invalid response");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const contacts = Array.isArray(json?.data) ? (json.data as ChatContact[]) : [];
      setOpenCount(computeOpenCount(contacts));
      setLastError(null);
    } catch (error) {
      console.error("Failed to refresh open conversations", error);
      setLastError("Falha ao atualizar conversas em aberto");
      setOpenCount(0);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [authLoading, user]);

  const optimisticAdjust = useCallback((delta: number) => {
    setOpenCount((current) => Math.max(0, current + delta));
  }, []);

  useEffect(() => {
    if (!user || authLoading) return;
    refresh();
  }, [authLoading, refresh, user]);

  useEffect(() => {
    if (!user || authLoading) return;
    const timer = window.setInterval(refresh, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [authLoading, pollIntervalMs, refresh, user]);

  useEffect(() => {
    if (!user || authLoading) return;
    const onInvalidate = () => refresh();
    window.addEventListener(INVALIDATE_EVENT, onInvalidate);
    return () => window.removeEventListener(INVALIDATE_EVENT, onInvalidate);
  }, [authLoading, refresh, user]);

  useEffect(() => {
    if (!user || authLoading) return;
    try {
      const bc = new BroadcastChannel(INVALIDATE_EVENT);
      const onMessage = (event: MessageEvent) => {
        if (event?.data?.type === "invalidate") refresh();
      };
      bc.addEventListener("message", onMessage);
      return () => {
        bc.removeEventListener("message", onMessage);
        bc.close();
      };
    } catch {
      return;
    }
  }, [authLoading, refresh, user]);

  const value = useMemo(
    () => ({ openCount, loading, lastError, refresh, optimisticAdjust }),
    [lastError, loading, openCount, optimisticAdjust, refresh]
  );

  return <ChatOpenConversationsContext.Provider value={value}>{children}</ChatOpenConversationsContext.Provider>;
}

export function useChatOpenConversations() {
  const ctx = useContext(ChatOpenConversationsContext);
  if (!ctx) throw new Error("useChatOpenConversations must be used within ChatOpenConversationsProvider");
  return ctx;
}
