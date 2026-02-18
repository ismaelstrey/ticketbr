import styled, { css } from "styled-components";

interface ButtonProps {
  variant?: "primary" | "ghost" | "save" | "pill" | "danger";
  $pillIndex?: number; // For the gradient pills
}

export const Button = styled.button<ButtonProps>`
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  padding: 0.55rem 0.95rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  transition: opacity 0.2s ease, transform 0.1s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  ${({ variant, theme, $pillIndex }) => {
    switch (variant) {
      case "ghost":
        return css`
          background: #eceff5;
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
           border: 1px solid ${theme.colors.border};
           color: ${theme.colors.text.secondary};
           
           &:hover {
             background: #f3f4f6;
             color: #dc2626;
             border-color: #d1d5db;
           }
        `;
      case "pill":
        // Logic for different gradients based on index (mimicking nth-child CSS)
        let background = "linear-gradient(135deg, #4285ff, #3f62d4)"; // Default blue
        
        if ($pillIndex === 1) background = "linear-gradient(135deg, #27cd8e, #1fa267)"; // Green
        if ($pillIndex === 2) background = "linear-gradient(135deg, #9b52d4, #7e3aa8)"; // Purple
        if ($pillIndex && $pillIndex > 2) background = "linear-gradient(135deg, #4db0ff, #2f80d9)"; // Light Blue

        return css`
          color: white;
          background: ${background};
        `;
      case "primary":
      default:
        return css`
          background: ${theme.colors.primary};
          color: white;
        `;
    }
  }}
`;
