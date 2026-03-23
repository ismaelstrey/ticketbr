"use client";

import styled from "styled-components";

const Wrap = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.primary}18` : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text.secondary)};
  border-radius: 999px;
  padding: 0.35rem 0.55rem;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Label = styled.span`
  font-size: 0.85rem;
  white-space: nowrap;
`;

const Track = styled.span<{ $active: boolean }>`
  width: 54px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $active }) => ($active ? `${theme.colors.primary}22` : theme.colors.surfaceAlt)};
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: ${({ $active }) => ($active ? "flex-end" : "flex-start")};
  transition: all 0.2s ease;
`;

const Knob = styled.span<{ $active: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.surface)};
  box-shadow: ${({ theme }) => theme.shadows.card};
  transition: all 0.2s ease;
`;

export function HistoryToggle({
  checked,
  label,
  onChange,
  disabled
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Wrap
      type="button"
      $active={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
    >
      <Label>{label}</Label>
      <Track $active={checked}>
        <Knob $active={checked} />
      </Track>
    </Wrap>
  );
}

