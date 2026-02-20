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
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ToastCard = styled.div<{ $type: ToastType }>`
  min-width: 280px;
  max-width: 420px;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  border: 1px solid
    ${({ $type }) => ($type === "success" ? "#86efac" : $type === "error" ? "#fca5a5" : "#93c5fd")};
  background: ${({ $type }) => ($type === "success" ? "#f0fdf4" : $type === "error" ? "#fef2f2" : "#eff6ff")};
  color: ${({ $type }) => ($type === "success" ? "#166534" : $type === "error" ? "#991b1b" : "#1e3a8a")};
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  animation: ${slideIn} 160ms ease;
`;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} $type={toast.type}>
            {toast.message}
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
