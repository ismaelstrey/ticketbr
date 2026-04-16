import styled, { css } from "styled-components";

const fieldStyles = css`
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: ${({ theme }) => theme.tokens.color.bg.surface};
  color: ${({ theme }) => theme.tokens.color.text.primary};
  transition:
    border-color ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing},
    outline ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing},
    background ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing},
    color ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing},
    box-shadow ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing};

  &::placeholder {
    color: ${({ theme }) => theme.tokens.color.text.muted};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.interactive.focus};
    border-color: ${({ theme }) => theme.tokens.color.interactive.primary};
    box-shadow: 0 0 0 4px ${({ theme }) => `${theme.tokens.color.interactive.primary}1f`};
  }

  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.tokens.color.status.warningBorder};
    box-shadow: 0 0 0 2px ${({ theme }) => `${theme.tokens.color.status.warning}1f`};
  }
`;

export const Input = styled.input`
  ${fieldStyles}
  padding: 0.55rem 0.65rem;
  min-height: 2.5rem;
  font-family: inherit;
  width: 100%;
`;

export const Select = styled.select`
  ${fieldStyles}
  padding: 0.55rem 0.7rem;
  min-height: 2.5rem;
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
