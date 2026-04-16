import styled, { css } from "styled-components";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "save" | "pill" | "danger";
  pillIndex?: number;
}

const StyledButton = styled.button<{ $variant?: string; $pillIndex?: number }>`
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  padding: 0.62rem 1rem;
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  transition:
    opacity ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing},
    transform ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.easing},
    background ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing},
    border-color ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing},
    color ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing};
  white-space: nowrap;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.interactive.primary};
    outline-offset: 2px;
  }

  ${({ $variant, theme, $pillIndex }) => {
    switch ($variant) {
      case "ghost":
        return css`
          background: ${theme.tokens.color.bg.surfaceAlt};
          border-color: ${theme.tokens.color.border.default};
          color: ${theme.tokens.color.text.primary};

          &:hover {
            background: ${theme.tokens.color.interactive.ghostHover};
            border-color: ${theme.tokens.color.border.strong};
          }
        `;
      case "save":
        return css`
          background: ${theme.tokens.color.status.success};
          border-color: transparent;
          color: ${theme.tokens.color.text.inverse};

          &:hover {
            opacity: 0.92;
          }
        `;
      case "danger":
        return css`
          background: transparent;
          border-color: ${theme.tokens.color.border.default};
          color: ${theme.tokens.color.text.secondary};

          &:hover {
            background: ${theme.tokens.color.status.warningSurface};
            color: ${theme.tokens.color.status.warning};
            border-color: ${theme.tokens.color.status.warningBorder};
          }
        `;
      case "pill": {
        const index = typeof $pillIndex === "number" ? Math.min(Math.max($pillIndex, 0), 3) : 0;
        const background = theme.tokens.color.interactive.pillGradients[index];

        return css`
          border-color: transparent;
          color: ${theme.tokens.color.text.inverse};
          background: ${background};

          &:hover {
            filter: brightness(1.04);
          }
        `;
      }
      case "primary":
      default:
        return css`
          background: ${theme.tokens.color.interactive.primary};
          border-color: transparent;
          color: ${theme.tokens.color.text.inverse};

          &:hover {
            background: ${theme.tokens.color.interactive.primaryHover};
          }
        `;
    }
  }}
`;

export function Button({ variant, pillIndex, children, ...props }: ButtonProps) {
  return (
    <StyledButton $variant={variant} $pillIndex={pillIndex} {...props}>
      {children}
    </StyledButton>
  );
}
