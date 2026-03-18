import styled, { css } from "styled-components";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "save" | "pill" | "danger";
  pillIndex?: number;
}

const StyledButton = styled.button<{ $variant?: string; $pillIndex?: number }>`
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  padding: 0.62rem 1rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  transition: opacity 0.2s ease, transform 0.1s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  ${({ $variant, theme, $pillIndex }) => {
    switch ($variant) {
      case "ghost":
        return css`
          background: ${theme.colors.surfaceAlt};
          border-color: ${theme.colors.border};
          color: ${theme.colors.text.primary};
        `;
      case "save":
        return css`
          background: ${theme.colors.status.success};
          color: ${theme.colors.text.white};
        `;
      case "danger":
        return css`
          background: transparent;
          border-color: ${theme.colors.border};
          color: ${theme.colors.text.secondary};

          &:hover {
            background: ${theme.colors.surfaceAlt};
            color: ${theme.colors.status.warning};
            border-color: ${theme.colors.borderStrong};
          }
        `;
      case "pill": {
        let background = "linear-gradient(135deg, #4285ff, #3f62d4)";
        if ($pillIndex === 1) background = "linear-gradient(135deg, #27cd8e, #1fa267)";
        if ($pillIndex === 2) background = "linear-gradient(135deg, #9b52d4, #7e3aa8)";
        if ($pillIndex && $pillIndex > 2) background = "linear-gradient(135deg, #4db0ff, #2f80d9)";

        return css`
          color: white;
          background: ${background};
        `;
      }
      case "primary":
      default:
        return css`
          background: ${theme.colors.primary};
          color: ${theme.colors.text.white};

          &:hover {
            background: ${theme.colors.primaryHover};
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
