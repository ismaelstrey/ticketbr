"use client";

import { useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useChatOpenConversations } from "@/context/ChatOpenConversationsContext";
import { IoLogoWhatsapp } from "react-icons/io";

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
  color: ${({ theme }) => (theme.mode === "dark" ? theme.colors.text.white : theme.colors.text.primary)};
  background: ${({ theme }) =>
    theme.mode === "dark"
      ? "linear-gradient(135deg, rgba(37, 99, 235, 0.65), rgba(139, 92, 246, 0.75))"
      : "linear-gradient(135deg, rgba(15, 23, 42, 0.06), rgba(99, 102, 241, 0.18))"};
  box-shadow: ${({ theme }) => theme.shadows.card};
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

export function GlobalChatButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { openCount } = useChatOpenConversations();

  const isChatRoute = pathname === "/chat" || pathname.startsWith("/chat/");
  const hidden = !user || loading || pathname === "/login";
  const shouldHideButton = hidden || isChatRoute;

  const badgeValue = useMemo(() => {
    if (!openCount) return null;
    if (openCount > 99) return "99+";
    return String(openCount);
  }, [openCount]);

  const handleOpenChat = () => {
    router.push("/chat");
  };

  if (shouldHideButton) return null;

  return (
    <FloatingButton type="button" onClick={handleOpenChat} $hasUnread={openCount > 0} aria-label="Abrir chat">
      <IconWrap>
        <IoLogoWhatsapp size={30} color="#25D366"/>
        {badgeValue ? <Badge>{badgeValue}</Badge> : null}
      </IconWrap>
      <ButtonLabel>Chat</ButtonLabel>
    </FloatingButton>
  );
}
