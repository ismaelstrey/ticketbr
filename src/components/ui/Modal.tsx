"use client";

import React, { useEffect, useId, useRef } from "react";
import styled from "styled-components";
import { FiX } from "react-icons/fi";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.tokens.color.bg.overlay};
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${({ theme }) => theme.zIndex.overlay};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ModalContainer = styled.div`
  background: ${({ theme }) => theme.tokens.color.bg.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.shadows.hover};
  overflow: hidden;
  color: ${({ theme }) => theme.tokens.color.text.primary};
  transform: translateY(0);
  animation: modal-enter ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing};

  @keyframes modal-enter {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Header = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  border-bottom: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    font-size: 1.1rem;
    font-weight: ${({ theme }) => theme.typography.weight.bold};
    color: ${({ theme }) => theme.tokens.color.text.primary};
    margin: 0;
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    color: ${({ theme }) => theme.tokens.color.text.muted};
    font-size: 1.2rem;
    padding: 0;
    display: flex;
    align-items: center;
    border-radius: ${({ theme }) => theme.borderRadius.small};

    &:hover {
      color: ${({ theme }) => theme.tokens.color.text.primary};
      background: ${({ theme }) => theme.tokens.color.interactive.ghostHover};
    }

    &:focus-visible {
      outline: 2px solid ${({ theme }) => theme.tokens.color.interactive.primary};
      outline-offset: 2px;
    }
  }
`;

const Content = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
  overflow-y: auto;
`;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  descriptionId?: string;
}

export function Modal({ isOpen, onClose, title, children, descriptionId }: ModalProps) {
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key !== "Tab" || !containerRef.current) return;

      const focusable = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    containerRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Overlay
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <ModalContainer
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <Header>
          <h2 id={titleId}>{title}</h2>
          <button onClick={() => onCloseRef.current()} aria-label="Fechar modal">
            <FiX aria-hidden="true" />
          </button>
        </Header>
        <Content>{children}</Content>
      </ModalContainer>
    </Overlay>
  );
}
