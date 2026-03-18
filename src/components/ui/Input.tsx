import styled, { css } from "styled-components";

const fieldStyles = css`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color 0.2s ease, outline 0.2s ease, background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary}33;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.primary}12;
  }
`;

export const Input = styled.input`
  ${fieldStyles}
  padding: 0.55rem 0.65rem;
  font-family: inherit;
  width: 100%;
`;

export const Select = styled.select`
  ${fieldStyles}
  padding: 0.55rem 0.7rem;
  font-family: inherit;
  cursor: pointer;
`;

export const Textarea = styled.textarea`
  ${fieldStyles}
  padding: 0.65rem;
  font-family: inherit;
  width: 100%;
  resize: vertical;
  min-height: 84px;
`;
