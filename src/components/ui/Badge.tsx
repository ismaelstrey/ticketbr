import styled, { css } from "styled-components";
import React from "react";
import { TicketPriority } from "@/types/ticket";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority?: TicketPriority;
  tone?: "neutral" | "success" | "warning" | "info";
}

const StyledBadge = styled.span<{ $priority?: TicketPriority; $tone: "neutral" | "success" | "warning" | "info" }>`
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  padding: 0.3rem 0.7rem;
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  background: ${({ theme }) => theme.tokens.color.bg.surfaceAlt};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  font-size: ${({ theme }) => theme.typography.size.xs};
  display: inline-flex;
  align-items: center;
  justify-content: center;

  ${({ $priority, $tone, theme }) => {
    const resolvedTone =
      $tone === "neutral" && $priority === "Alta"
        ? "warning"
        : $tone === "neutral" && $priority === "Média"
          ? "info"
          : $tone;

    switch (resolvedTone) {
      case "success":
        return css`
          border-color: ${theme.tokens.color.status.successBorder};
          background: ${theme.tokens.color.status.successSurface};
          color: ${theme.tokens.color.status.success};
        `;
      case "warning":
        return css`
          border-color: ${theme.tokens.color.status.warningBorder};
          background: ${theme.tokens.color.status.warningSurface};
          color: ${theme.tokens.color.status.warning};
        `;
      case "info":
        return css`
          border-color: ${theme.tokens.color.status.infoBorder};
          background: ${theme.tokens.color.status.infoSurface};
          color: ${theme.tokens.color.status.info};
        `;
      case "neutral":
      default:
        return css``;
    }
  }}
`;

export function Badge({ priority, tone = "neutral", children, ...props }: BadgeProps) {
  return (
    <StyledBadge $priority={priority} $tone={tone} {...props}>
      {children}
    </StyledBadge>
  );
}

