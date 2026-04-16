"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ToastStack = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: ${({ theme }) => theme.zIndex.toast};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
`;

const ToastCard = styled.div<{ $type: ToastType }>`
  min-width: 280px;
  max-width: 420px;
  padding: 0.75rem 0.9rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border: 1px solid
    ${({ $type, theme }) =>
      $type === "success"
        ? theme.tokens.color.status.successBorder
        : $type === "error"
          ? theme.tokens.color.status.warningBorder
          : theme.tokens.color.status.infoBorder};
  background: ${({ $type, theme }) =>
    $type === "success"
      ? theme.tokens.color.status.successSurface
      : $type === "error"
        ? theme.tokens.color.status.warningSurface
        : theme.tokens.color.status.infoSurface};
  color: ${({ $type, theme }) =>
    $type === "success"
      ? theme.tokens.color.status.successText
      : $type === "error"
        ? theme.tokens.color.status.warningText
        : theme.tokens.color.status.infoText};
  box-shadow: ${({ theme }) => theme.shadows.card};
  animation: ${slideIn} ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing};
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ToastMessage = styled.span`
  flex: 1;
`;

const DismissButton = styled.button`
  background: transparent;
  border: 0;
  color: inherit;
  opacity: 0.75;
  cursor: pointer;
  line-height: 1;
  padding: 0.05rem;

  &:hover {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.interactive.primary};
    outline-offset: 2px;
  }
`;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      dismissToast(id);
    }, 3500);
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack role="status" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} $type={toast.type} role={toast.type === "error" ? "alert" : "status"}>
            <ToastMessage>{toast.message}</ToastMessage>
            <DismissButton
              type="button"
              aria-label="Fechar notificação"
              onClick={() => dismissToast(toast.id)}
            >
              ×
            </DismissButton>
          </ToastCard>
        ))}
      </ToastStack>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
