"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useRouter } from "next/navigation";
import { FiBell, FiCheck } from "@/components/icons";
import { useNotifications, type NotificationItem } from "@/hooks/useNotifications";

const BellButton = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    transform: translateY(-1px);
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Panel = styled.div<{ $top: number; $left: number }>`
  position: fixed;
  top: ${({ $top }) => `${$top}px`};
  left: ${({ $left }) => `${$left}px`};
  width: 340px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.28);
  z-index: 200;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const PanelTitle = styled.span`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const MarkAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const List = styled.div`
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const ListItem = styled.button<{ $unread: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.75rem 1rem;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $unread }) => ($unread ? "rgba(99, 102, 241, 0.08)" : "transparent")};
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

const ItemTitle = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ItemBody = styled.span`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ItemDate = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EmptyState = styled.div`
  padding: 1.5rem 1rem;
  text-align: center;
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

// Formata a data de criação da notificação para exibição no painel
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/**
 * Sino de notificações in-app: mostra o total de não lidas e um painel com
 * os últimos avisos, permitindo abrir o item e marcar como lido.
 */
export function NotificationBell() {
  const router = useRouter();
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const togglePanel = useCallback(() => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.right + 8 });
    }
    setIsOpen((prev) => !prev);
  }, [isOpen]);

  // Fecha o painel quando o usuário clica fora dele
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = async (item: NotificationItem) => {
    if (!item.readAt) {
      await markRead(item.id);
    }
    setIsOpen(false);
    if (item.link) {
      router.push(item.link);
    }
  };

  return (
    <>
      <BellButton
        ref={buttonRef}
        type="button"
        onClick={togglePanel}
        aria-label={`Notificações${unreadCount ? ` (${unreadCount} não lidas)` : ""}`}
        title="Notificações"
      >
        <FiBell />
        {unreadCount > 0 && <Badge>{unreadCount > 99 ? "99+" : unreadCount}</Badge>}
      </BellButton>

      {isOpen && (
        <Panel ref={panelRef} $top={coords.top} $left={coords.left}>
          <PanelHeader>
            <PanelTitle>Notificações</PanelTitle>
            {unreadCount > 0 && (
              <MarkAllButton type="button" onClick={() => void markAllRead()}>
                <FiCheck /> Marcar todas como lidas
              </MarkAllButton>
            )}
          </PanelHeader>

          <List>
            {items.length === 0 ? (
              <EmptyState>Nenhuma notificação por aqui.</EmptyState>
            ) : (
              items.map((item) => (
                <ListItem
                  key={item.id}
                  $unread={!item.readAt}
                  type="button"
                  onClick={() => void handleSelect(item)}
                >
                  <ItemTitle>{item.title}</ItemTitle>
                  {item.body && <ItemBody>{item.body}</ItemBody>}
                  <ItemDate>{formatDate(item.createdAt)}</ItemDate>
                </ListItem>
              ))
            )}
          </List>
        </Panel>
      )}
    </>
  );
}
