"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { usePathname, useRouter } from "next/navigation";
import { FiUsers } from "@/components/icons";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import type { ChatContact } from "@/types/chat";

const STORAGE_KEY = "ticketbr-chat-last-seen";
const POLL_INTERVAL_MS = 15000;

const floatPulse = keyframes`
  0%, 100% { transform: translateY(0); box-shadow: 0 16px 30px rgba(37, 99, 235, 0.28); }
  50% { transform: translateY(-2px); box-shadow: 0 20px 34px rgba(37, 99, 235, 0.36); }
`;

const FloatingButton = styled.button<{ $hasUnread: boolean }>`
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 120;
  border: none;
  border-radius: 999px;
  padding: 0.9rem 1rem;
  min-width: 60px;
  height: 60px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.white};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.status.purple});
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.28);
  transition: transform 0.2s ease, opacity 0.2s ease;
  animation: ${({ $hasUnread }) => ($hasUnread ? floatPulse : "none")} 2.2s ease-in-out infinite;

  &:hover {
    transform: translateY(-2px) scale(1.01);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    right: 1rem;
    bottom: 1rem;
    height: 56px;
    padding: 0.85rem 0.95rem;
  }
`;

const ButtonLabel = styled.span`
  font-size: 0.92rem;
  font-weight: 700;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: none;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -4px;
  right: -2px;
  min-width: 24px;
  height: 24px;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.status.warning};
  color: ${({ theme }) => theme.colors.text.white};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  border: 2px solid ${({ theme }) => theme.colors.surface};
`;

const IconWrap = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
`;

function readSeenMap() {
  if (typeof window === "undefined") return {} as Record<string, string>;
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, string>;
  } catch {
    return {} as Record<string, string>;
  }
}

function persistSeenMap(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function buildSeenMap(contacts: ChatContact[]) {
  return contacts.reduce<Record<string, string>>((acc, contact) => {
    if (contact.lastMessageAt) {
      acc[contact.id] = contact.lastMessageAt;
    }
    return acc;
  }, {});
}

export function GlobalChatButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const previousUnreadRef = useRef(0);

  const hidden = !user || loading || pathname === "/login";

  const unreadCount = useMemo(() => {
    const seenMap = readSeenMap();
    return contacts.reduce((count, contact) => {
      if (!contact.lastMessageAt) return count;
      const seenAt = seenMap[contact.id];
      if (!seenAt) return count + 1;
      return new Date(contact.lastMessageAt).getTime() > new Date(seenAt).getTime() ? count + 1 : count;
    }, 0);
  }, [contacts]);

  useEffect(() => {
    if (hidden) return;

    let cancelled = false;

    const loadContacts = async () => {
      try {
        const res = await fetch("/api/chat/contacts", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setContacts(Array.isArray(json?.data) ? json.data : []);
        }
      } catch {
        // silently ignore polling issues
      }
    };

    loadContacts();
    const timer = window.setInterval(loadContacts, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hidden]);

  useEffect(() => {
    if (hidden) return;

    if (pathname === "/chat") {
      persistSeenMap(buildSeenMap(contacts));
      previousUnreadRef.current = 0;
      return;
    }

    if (unreadCount > previousUnreadRef.current && previousUnreadRef.current !== 0) {
      showToast(
        unreadCount === 1 ? "Você recebeu uma nova mensagem no chat." : `Você tem ${unreadCount} conversas com novas mensagens.`,
        "info"
      );
    }

    previousUnreadRef.current = unreadCount;
  }, [contacts, hidden, pathname, showToast, unreadCount]);

  const handleOpenChat = () => {
    persistSeenMap(buildSeenMap(contacts));
    previousUnreadRef.current = 0;
    router.push("/chat");
  };

  if (hidden) return null;

  return (
    <FloatingButton type="button" onClick={handleOpenChat} $hasUnread={unreadCount > 0} aria-label="Abrir chat">
      <IconWrap>
        <FiUsers />
        {unreadCount > 0 ? <Badge>{unreadCount > 99 ? "99+" : unreadCount}</Badge> : null}
      </IconWrap>
      <ButtonLabel>Chat</ButtonLabel>
    </FloatingButton>
  );
}
