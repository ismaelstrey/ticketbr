"use client";

import styled from "styled-components";
import { FiSearch, FiTool, FiCheckCircle, FiFilter, FiHelpCircle } from "@/components/icons";
import { Button } from "@/components/ui/Button";

const TopbarContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchWrapper = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  background: ${({ theme }) => theme.colors.surface};
  min-width: 280px;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.85rem;
  color: ${({ theme }) => theme.colors.text.secondary};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    min-width: 0;
  }
`;

const SearchInput = styled.input`
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  padding: 0.7rem 0.15rem;
  background: transparent;
  min-width: 220px;
  width: 100%;
  outline: none;
  font-family: inherit;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 100%;
    min-width: 0;
  }
`;

const ActionsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
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
}

export function Topbar({ query, setQuery }: TopbarProps) {
  return (
    <TopbarContainer>
      <SearchWrapper>
        <FiSearch aria-hidden="true" />
        <SearchInput
          placeholder="Buscar ticket, empresa ou assunto"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </SearchWrapper>
      <ActionsWrapper>
        {actionButtons.map(({ label, icon: Icon }, index) => (
          <Button key={label} variant="pill" $pillIndex={index} type="button">
            <Icon aria-hidden="true" />
            {label}
          </Button>
        ))}
      </ActionsWrapper>
    </TopbarContainer>
  );
}
