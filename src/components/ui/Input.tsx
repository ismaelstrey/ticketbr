import styled from "styled-components";

export const Input = styled.input`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  padding: 0.55rem 0.65rem;
  font-family: inherit;
  width: 100%;
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary}33; /* 33 = 20% opacity */
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const Select = styled.select`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  background: ${({ theme }) => theme.colors.surface};
  font-family: inherit;
  cursor: pointer;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary}33;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const Textarea = styled.textarea`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  padding: 0.65rem;
  font-family: inherit;
  width: 100%;
  resize: vertical;
  min-height: 84px;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary}33;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;
