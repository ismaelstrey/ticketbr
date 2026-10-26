import styled from "styled-components";

type Align = "left" | "center" | "right";

/** Primitivos de tabela compartilhados pelas telas de contratos. */
export const TableScroll = styled.div`
  overflow-x: auto;
`;

export const Table = styled.table<{ $minWidth?: string }>`
  width: 100%;
  border-collapse: collapse;
  min-width: ${({ $minWidth }) => $minWidth ?? "640px"};
`;

export const Th = styled.th<{ $align?: Align }>`
  text-align: ${({ $align }) => $align ?? "left"};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: ${({ theme }) => theme.tokens.color.bg.surfaceAlt};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
  border-bottom: 1px solid ${({ theme }) => theme.tokens.color.border.default};
`;

export const Td = styled.td<{ $align?: Align }>`
  text-align: ${({ $align }) => $align ?? "left"};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-bottom: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

export const ActionsCell = styled.div`
  display: inline-flex;
  gap: ${({ theme }) => theme.spacing[1]};
`;

export const IconButton = styled.button<{ $tone?: "info" | "neutral" | "danger" }>`
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === "danger" ? theme.tokens.color.status.warningBorder : theme.tokens.color.border.default};
  background: ${({ theme, $tone }) =>
    $tone === "danger" ? theme.tokens.color.status.warningSurface : theme.tokens.color.bg.surface};
  color: ${({ theme, $tone }) =>
    $tone === "danger"
      ? theme.tokens.color.status.warning
      : $tone === "info"
        ? theme.tokens.color.interactive.primary
        : theme.tokens.color.text.primary};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  padding: 0.35rem 0.5rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    background ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.easing},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.easing};

  &:hover:not(:disabled) {
    background: ${({ theme, $tone }) =>
      $tone === "danger"
        ? theme.tokens.color.status.warningSurface
        : theme.tokens.color.interactive.ghostHover};
    border-color: ${({ theme, $tone }) =>
      $tone === "danger"
        ? theme.tokens.color.status.warningBorder
        : theme.tokens.color.border.strong};
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.interactive.primary};
    outline-offset: 2px;
  }
`;
