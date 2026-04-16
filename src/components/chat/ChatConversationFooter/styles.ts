import styled from "styled-components";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";

export const FooterSurface = styled.div`
  position: relative;
  z-index: 10;
  padding: 16px;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  backdrop-filter: blur(14px);
  box-shadow: ${({ theme }) => theme.shadows.card};
  transition: box-shadow 220ms ease, transform 220ms ease;

  &:focus-within {
    box-shadow: ${({ theme }) => theme.shadows.hover};
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: 12px;
  }
`;

export const FooterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: center;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

export const FieldGroup = styled.div`
  display: grid;
  gap: 8px;
  min-width: 0;
`;

export const LabelRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`;

export const Label = styled.span`
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.01em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const SubtleHint = styled.span`
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  font-weight: 400;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
`;

export const MinimalSelect = styled(Select)`
  width: 100%;
  box-shadow: none;
  border: none;
  box-shadow: inset 0 0 0 1px ${({ theme }) => theme.colors.border};
  transition: box-shadow 220ms ease;

  &:focus {
    outline: none;
    box-shadow:
      inset 0 0 0 1px ${({ theme }) => theme.colors.primary},
      0 0 0 0.22rem ${({ theme }) => `${theme.colors.primary}22`};
  }
`;

export const Actions = styled.div`
  display: inline-flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 1024px) {
    justify-content: stretch;
  }
`;

export const PrimaryButton = styled(Button)`
  min-width: 140px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  transition: transform 220ms ease, box-shadow 220ms ease, opacity 220ms ease;

  &:hover:not(:disabled) {
    box-shadow: ${({ theme }) => theme.shadows.hover};
    transform: translateY(-1px);
  }
`;

export const SecondaryButton = styled(Button)`
  min-width: 160px;
  box-shadow: none;
  transition: transform 220ms ease, opacity 220ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }
`;

export const IconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-right: 8px;
  opacity: 0.9;

  svg {
    width: 18px;
    height: 18px;
  }
`;
