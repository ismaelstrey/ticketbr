"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { CiMenuKebab } from "react-icons/ci";

const Root = styled.div`
  position: relative;
  display: inline-flex;
`;

const Trigger = styled.button<{ $open: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  border: 1px solid ${({ theme, $open }) => ($open ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $open }) => ($open ? `${theme.colors.primary}18` : theme.colors.surfaceAlt)};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => `${theme.colors.primary}18`};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const Menu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  padding: 0.35rem;
  z-index: 20;
  transform-origin: top right;
  animation: pop 140ms ease;

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const Item = styled.button<{ $active?: boolean }>`
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 12px;
  padding: 0.55rem 0.6rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.9rem;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
    border-color: ${({ theme }) => theme.colors.border};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const ItemLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
`;

const Badge = styled.span<{ $on: boolean }>`
  width: 36px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid ${({ theme, $on }) => ($on ? `${theme.colors.primary}80` : theme.colors.borderStrong)};
  background: ${({ theme, $on }) => ($on ? `${theme.colors.primary}35` : theme.colors.surface)};
  padding: 2px;
  display: flex;
  justify-content: ${({ $on }) => ($on ? "flex-end" : "flex-start")};
  transition: all 0.15s ease;
`;

const BadgeDot = styled.span<{ $on: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${({ theme, $on }) => ($on ? theme.colors.primary : theme.colors.text.primary)};
  box-shadow: ${({ theme }) => theme.shadows.card};
  transition: all 0.15s ease;
`;

function useStableId(prefix: string) {
  return useMemo(() => `${prefix}-${Math.random().toString(36).slice(2)}`, [prefix]);
}

export function ChatActionsMenu({
  showArchived,
  onToggleShowArchived,
  enableAlert,
  onRequestAlertPermission,
  enableSound,
  onToggleSound,
  disabled
}: {
  showArchived: boolean;
  onToggleShowArchived: (next: boolean) => void;
  enableAlert: boolean;
  onRequestAlertPermission: () => void;
  enableSound: boolean;
  onToggleSound: (next: boolean) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useStableId("chat-actions-menu");

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = () => setOpen((value) => !value);

  return (
    <Root ref={rootRef}>
      <Trigger
        type="button"
        $open={open}
        onClick={toggle}
        disabled={disabled}
        aria-label="Menu de ações do chat"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <CiMenuKebab size={20} />
      </Trigger>

      {open ? (
        <Menu role="menu" id={menuId} aria-label="Ações do chat">
          <Item
            type="button"
            role="menuitemcheckbox"
            aria-checked={showArchived}
            onClick={() => {
              onToggleShowArchived(!showArchived);
              setOpen(false);
            }}
          >
            <ItemLabel>Mostrar conversas anteriores</ItemLabel>
            <Badge $on={showArchived}>
              <BadgeDot $on={showArchived} />
            </Badge>
          </Item>

          <Item
            type="button"
            role="menuitem"
            onClick={() => {
              onRequestAlertPermission();
              setOpen(false);
            }}
          >
            <ItemLabel>Ativar alerta</ItemLabel>
            <Badge $on={enableAlert}>
              <BadgeDot $on={enableAlert} />
            </Badge>
          </Item>

          <Item
            type="button"
            role="menuitemcheckbox"
            aria-checked={enableSound}
            onClick={() => {
              onToggleSound(!enableSound);
              setOpen(false);
            }}
          >
            <ItemLabel>Ativar som</ItemLabel>
            <Badge $on={enableSound}>
              <BadgeDot $on={enableSound} />
            </Badge>
          </Item>
        </Menu>
      ) : null}
    </Root>
  );
}
