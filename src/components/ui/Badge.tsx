import styled, { css } from "styled-components";
import { TicketPriority } from "@/types/ticket";

interface BadgeProps {
  priority?: TicketPriority;
}

export const Badge = styled.span<BadgeProps>`
  border: 1px solid #9b9b9b;
  border-radius: 20px;
  padding: 0.3rem 0.7rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 600;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  ${({ priority, theme }) => {
    switch (priority) {
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
