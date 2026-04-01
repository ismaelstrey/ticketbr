"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import styled from "styled-components";

const Wrap = styled.div`
  position: absolute;
  top: 4.25rem;
  right: 1.25rem;
  z-index: 30;
  width: min(15vw, 220px);
  max-width: 15vw;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    right: 0.8rem;
    top: 4.1rem;
  }
`;

const Handle = styled.button<{ $open: boolean }>`
  width: 26px;
  height: 44px;
  border-radius: 999px;
  border: 0;
  background: ${({ theme }) => `${theme.colors.text.primary}0a`};
  color: ${({ theme }) => theme.colors.text.primary};
  opacity: ${({ $open }) => ($open ? 0.28 : 0.2)};
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: opacity 300ms ease, background 300ms ease, transform 300ms ease;

  &:hover {
    opacity: 0.4;
    background: ${({ theme }) => `${theme.colors.text.primary}12`};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 0;
    opacity: 0.4;
    background: ${({ theme }) => `${theme.colors.text.primary}12`};
  }
`;

const HandleDots = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 -8px 0 currentColor, 0 8px 0 currentColor;
  opacity: 0.75;
`;

const Panel = styled.div`
  margin-top: 0.55rem;
  padding: 0.75rem 0.9rem;
  border-radius: 16px;
  background: ${({ theme }) => `${theme.colors.text.primary}08`};
  color: ${({ theme }) => theme.colors.text.primary};
  opacity: 0.28;
  transition: opacity 300ms ease, background 300ms ease, transform 300ms ease;
  transform: translateY(0);

  &:hover {
    opacity: 0.4;
    background: ${({ theme }) => `${theme.colors.text.primary}0d`};
    transform: translateY(-1px);
  }
`;

const Title = styled.div`
  font-size: 12px;
  font-weight: 300;
  line-height: 1.2;
  letter-spacing: 0.01em;
`;

const Hint = styled.div`
  margin-top: 0.25rem;
  font-size: 11px;
  font-weight: 300;
  line-height: 1.25;
  opacity: 0.8;
`;

const Actions = styled.div`
  margin-top: 0.6rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
`;

export function PeripheralNotice({
  title,
  hint,
  children,
  idleMs = 3000
}: {
  title: string;
  hint?: string;
  children?: ReactNode;
  idleMs?: number;
}) {
  const [open, setOpen] = useState(true);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const armTimer = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => setOpen(false), idleMs);
  };

  useEffect(() => {
    if (!open) return;
    armTimer();
    return () => clearTimer();
  }, [idleMs, open]);

  return (
    <Wrap onMouseEnter={() => setOpen(true)} onMouseMove={() => open && armTimer()}>
      <Handle
        type="button"
        aria-label="Exibir status da conversa"
        $open={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
      >
        <HandleDots />
      </Handle>

      {open ? (
        <Panel
          role="status"
          onMouseEnter={() => armTimer()}
          onMouseMove={() => armTimer()}
          onPointerDown={() => armTimer()}
          onFocus={() => armTimer()}
        >
          <Title>{title}</Title>
          {hint ? <Hint>{hint}</Hint> : null}
          {children ? <Actions>{children}</Actions> : null}
        </Panel>
      ) : null}
    </Wrap>
  );
}

