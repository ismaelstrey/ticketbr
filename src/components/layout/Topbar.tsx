"use client";

import styled from "styled-components";
import { FiSearch, FiTool, FiCheckCircle, FiFilter, FiHelpCircle, FiPlus } from "@/components/icons";
import { Button } from "@/components/ui/Button";

const TopbarContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchWrapper = styled.div`
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  background: ${({ theme }) => theme.tokens.color.bg.surface};
  min-width: 280px;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  transition:
    border-color ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing},
    box-shadow ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing};

  &:focus-within {
    border-color: ${({ theme }) => theme.tokens.color.interactive.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => `${theme.tokens.color.interactive.primary}22`};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    min-width: 0;
  }
`;

const SearchInput = styled.input`
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  padding: ${({ theme }) => theme.spacing[3]} 0.15rem;
  background: transparent;
  min-width: 220px;
  width: 100%;
  outline: none;
  font-family: inherit;
  color: ${({ theme }) => theme.tokens.color.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.tokens.color.text.muted};
  }

  &:focus-visible {
    outline: none;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    min-width: 0;
  }
`;

const ActionsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const actionButtons = [
  { label: "Ticket", icon: FiTool },
  { label: "Tarefa", icon: FiCheckCircle },
  { label: "Filtros", icon: FiFilter },
  { label: "Ajuda", icon: FiHelpCircle }
];

interface TopbarProps {
  query: string;
  setQuery: (query: string) => void;
  onNewTicket?: () => void;
}

export function Topbar({ query, setQuery, onNewTicket }: TopbarProps) {
  return (
    <TopbarContainer>
      <SearchWrapper>
        <FiSearch aria-hidden="true" />
        <SearchInput
          aria-label="Buscar tickets"
          placeholder="Buscar ticket, empresa ou assunto"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </SearchWrapper>
      <ActionsWrapper>
        <Button variant="primary" onClick={onNewTicket} type="button">
          <FiPlus aria-hidden="true" />
          Novo Ticket
        </Button>
        {actionButtons.map(({ label, icon: Icon }, index) => (
          <Button key={label} variant="pill" pillIndex={index} type="button">
            <Icon aria-hidden="true" />
            {label}
          </Button>
        ))}
      </ActionsWrapper>
    </TopbarContainer>
  );
}
