"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { FiExternalLink, FiSearch } from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useInventorySearch } from "@/hooks/useInventory";
import { InfraSearchResult } from "@/types/inventory";
import { EQUIPMENT_TYPE_LABELS } from "./labels";

const SearchWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Results = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 50vh;
  overflow-y: auto;
`;

const ResultItem = styled.li<{ $active: boolean }>`
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.tokens.color.interactive.primary : theme.tokens.color.border.default)};
  background: ${({ theme, $active }) =>
    $active ? theme.tokens.color.interactive.ghostHover : theme.tokens.color.bg.surface};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  padding: 0.65rem 0.8rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const ResultHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ResultName = styled.span`
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const Path = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

const MatchedRow = styled.div`
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
`;

const Hint = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  text-align: center;
  padding: 1.25rem 0;
`;

const OpenLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.tokens.color.interactive.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

// Garante que o link abra como URL absoluta
function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

interface InfraSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  solicitanteId?: string;
}

/**
 * Busca rápida global do inventário (atalho Ctrl/Cmd + K): responde "onde está o recurso?".
 */
export function InfraSearchPalette({ isOpen, onClose, onSelect, solicitanteId }: InfraSearchPaletteProps) {
  const { results, loading, error, search, clear } = useInventorySearch(solicitanteId);
  const [term, setTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Limpa o estado ao abrir/fechar o painel
  useEffect(() => {
    if (!isOpen) {
      setTerm("");
      setActiveIndex(0);
      clear();
    }
  }, [isOpen, clear]);

  // Aplica debounce na digitação antes de chamar a API
  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      search(term);
      setActiveIndex(0);
    }, 250);
    return () => clearTimeout(timeout);
  }, [term, isOpen, search]);

  // Seleciona o resultado ativo e fecha o painel
  const choose = (result: InfraSearchResult) => {
    onSelect(result.id);
    onClose();
  };

  // Navegação por teclado na lista de resultados
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[activeIndex]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Busca rápida do inventário">
      <SearchWrap>
        <Input
          autoFocus
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Onde está o Zabbix? Busque por nome, IP, hostname, tag, VMID..."
          aria-label="Buscar recurso no inventário"
        />

        {error ? <Hint>{error}</Hint> : null}
        {loading ? <Hint>Buscando...</Hint> : null}

        {!loading && !error && term.trim().length >= 2 && !results.length ? (
          <Hint>Nenhum recurso encontrado.</Hint>
        ) : null}
        {term.trim().length < 2 ? <Hint>Digite ao menos 2 caracteres para buscar.</Hint> : null}

        {results.length ? (
          <Results>
            {results.map((result, index) => (
              <ResultItem
                key={result.id}
                $active={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(result)}
              >
                <ResultHeader>
                  <FiSearch aria-hidden="true" />
                  <ResultName>{result.name}</ResultName>
                  <Badge tone="neutral">{EQUIPMENT_TYPE_LABELS[result.type]}</Badge>
                  {result.url ? (
                    <OpenLink
                      href={normalizeUrl(result.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <FiExternalLink aria-hidden="true" /> Abrir
                    </OpenLink>
                  ) : null}
                </ResultHeader>
                <Path>{result.path || result.name}</Path>
                {result.matchedOn.length ? (
                  <MatchedRow>
                    {result.matchedOn.map((field) => (
                      <Badge key={field} tone="info">
                        {field}
                      </Badge>
                    ))}
                  </MatchedRow>
                ) : null}
              </ResultItem>
            ))}
          </Results>
        ) : null}
      </SearchWrap>
    </Modal>
  );
}
