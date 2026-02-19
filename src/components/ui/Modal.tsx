"use client";

import React, { useEffect, useId, useRef } from "react";
import styled from "styled-components";
import { FiX } from "react-icons/fi";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 1rem;
`;

const ModalContainer = styled.div`
  background: #fff;
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  overflow: hidden;
`;

const Header = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;

  h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #333;
    margin: 0;
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
    font-size: 1.2rem;
    padding: 0;
    display: flex;
    align-items: center;
    
    &:hover {
      color: #333;
    }
  }
`;

const Content = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
`;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  const titleId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    containerRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <Overlay
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <ModalContainer
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <Header>
          <h2 id={titleId}>{title}</h2>
          <button onClick={onClose} aria-label="Fechar modal">
            <FiX aria-hidden="true" />
          </button>
        </Header>
        <Content>
          {children}
        </Content>
      </ModalContainer>
    </Overlay>
  );
}
