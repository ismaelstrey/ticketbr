import styled, { css } from "styled-components";
import React from "react";
import { TicketPriority } from "@/types/ticket";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority?: TicketPriority;
}

const StyledBadge = styled.span<{ $priority?: TicketPriority }>`
  border: 1px solid #9b9b9b;
  border-radius: 20px;
  padding: 0.3rem 0.7rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 600;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  ${({ $priority, theme }) => {
    switch ($priority) {
      case "Alta":
        return css`
          border-color: ${theme.colors.status.warning};
          color: ${theme.colors.status.warning};
        `;
      case "Média":
        return css`
          border-color: ${theme.colors.status.info};
          color: ${theme.colors.status.info};
        `;
      default:
        return css``;
    }
  }}
`;

export function Badge({ priority, children, ...props }: BadgeProps) {
  return (
    <StyledBadge $priority={priority} {...props}>
      {children}
    </StyledBadge>
  );
}
