"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  FiAlertCircle,
  FiZap,
  FiPauseCircle,
  FiCheckCircle
} from "@/components/icons";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { KanbanColumn } from "./Column";
import { PauseModal } from "./PauseModal";
import TicketDetails from "@/components/ticket/TicketDetails";
import NewTicketModal from "@/components/ticket/NewTicketModal";

import { columns } from "@/data/kanban-columns";
import { useTicketDragDrop } from "@/hooks/useTicketDragDrop";
import { useTicketEditor } from "@/hooks/useTicketEditor";
import { useTicketFilters } from "@/hooks/useTicketFilters";
import { api } from "@/services/api";
import { useToast } from "@/context/ToastContext";

const columnIcons = {
  todo: FiAlertCircle,
  doing: FiZap,
  paused: FiPauseCircle,
  done: FiCheckCircle
} as const;

const KPIsGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 0.8rem;
  margin-bottom: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const KPIArticle = styled(Card)`
  padding: 0.8rem 1rem;
  
  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 0.8rem;
  }

  strong {
    font-size: 1.35rem;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const FiltersContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.8rem;

  h1 {
    margin: 0;
    font-size: 1.4rem;
    color: ${({ theme }) => theme.colors.text.primary};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 0.6rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    flex-direction: column;
  }
`;

const KanbanGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(280px, 1fr));
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(2, minmax(280px, 1fr));
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

export default function KanbanBoard() {
  const {
    tickets,
    setTickets,
    dragOverColumn,
    onTicketDragStart,
    onTicketDragEnd,
    onColumnDragOver,
    onColumnDrop,
    setDragOverColumn,
    pauseModalTicket,
    pauseReason,
    setPauseReason,
    closePauseModal,
    confirmPause
  } = useTicketDragDrop();

  const { selectedTicket, openTicket, closeTicket, updateSelectedTicket } = useTicketEditor(tickets, setTickets);

  const {
    filteredTickets,
    query,
    setQuery,
    priority,
    setPriority,
    status,
    setStatus,
    totalOpen,
    avgSla,
    atRiskCount
  } = useTicketFilters(tickets);

  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const { showToast } = useToast();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTickets() {
      try {
        const response = await api.tickets.list();
        if (!isMounted) return;

        if (Array.isArray(response.data)) {
          setTickets(response.data);
        }
        setLoadError(null);
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load tickets from API. Using local fallback.", error);
        setLoadError("Não foi possível sincronizar tickets com o servidor.");
      }
    }

    loadTickets();

    return () => {
      isMounted = false;
    };
  }, [setTickets]);

  const handleSaveTicket = async () => {
    if (!selectedTicket) return;
    try {
        await api.tickets.update(selectedTicket.id, selectedTicket);
        closeTicket();
        showToast("Ticket atualizado com sucesso.", "success");
    } catch (err) {
        console.error("Failed to save ticket", err);
        showToast("Erro ao atualizar ticket.", "error");
    }
  };

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        {selectedTicket ? (
          <TicketDetails
            ticket={selectedTicket}
            onBack={closeTicket}
            onChange={updateSelectedTicket}
            onSave={handleSaveTicket}
          />
        ) : (
          <>
            <Topbar 
              query={query} 
              setQuery={setQuery} 
              onNewTicket={() => setIsNewTicketModalOpen(true)}
            />

            <KPIsGrid>
              <KPIArticle>
                <p>Tickets visíveis</p>
                <strong>{filteredTickets.length}</strong>
              </KPIArticle>
              <KPIArticle>
                <p>Em aberto</p>
                <strong>{totalOpen}</strong>
              </KPIArticle>
              <KPIArticle>
                <p>SLA médio (abertos)</p>
                <strong>{avgSla}%</strong>
              </KPIArticle>
              <KPIArticle>
                <p>SLA em atenção</p>
                <strong>{atRiskCount}</strong>
              </KPIArticle>
            </KPIsGrid>

            <FiltersContainer>
              <h1>Tickets • Listagem de Tickets</h1>
              {loadError && <small>{loadError}</small>}
              <FilterGroup>
                <Select value={priority} onChange={(event) => setPriority(event.target.value as any)}>
                  <option value="all">Prioridade: Todas</option>
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Sem prioridade">Sem prioridade</option>
                </Select>
                <Select value={status} onChange={(event) => setStatus(event.target.value as any)}>
                  <option value="all">Status: Todos</option>
                  <option value="todo">A fazer</option>
                  <option value="doing">Atendendo</option>
                  <option value="paused">Pausado</option>
                  <option value="done">Finalizado</option>
                </Select>
              </FilterGroup>
            </FiltersContainer>

            <KanbanGrid>
              {columns.map((column) => {
                const columnTickets = filteredTickets.filter((ticket) => ticket.status === column.key);
                const ColumnIcon = columnIcons[column.key as keyof typeof columnIcons];

                return (
                  <KanbanColumn
                    key={column.key}
                    columnKey={column.key}
                    title={column.title}
                    color={column.color}
                    icon={ColumnIcon}
                    tickets={columnTickets}
                    isDragOver={dragOverColumn === column.key}
                    onDragOver={(e) => onColumnDragOver(e, column.key as any)}
                    onDrop={(e) => onColumnDrop(e, column.key as any)}
                    onDragLeave={() => {
                       setDragOverColumn(null);
                    }}
                    onTicketDragStart={onTicketDragStart}
                    onTicketDragEnd={onTicketDragEnd}
                    onOpenTicket={openTicket}
                  />
                );
              })}
            </KanbanGrid>
          </>
        )}

        {pauseModalTicket && (
          <PauseModal
            ticket={pauseModalTicket}
            reason={pauseReason}
            setReason={setPauseReason}
            onClose={closePauseModal}
            onConfirm={confirmPause}
          />
        )}

        <NewTicketModal 
          isOpen={isNewTicketModalOpen} 
          onClose={() => setIsNewTicketModalOpen(false)}
          onCreated={async () => {
            const response = await api.tickets.list();
            if (Array.isArray(response.data)) {
              setTickets(response.data);
            }
          }}
        />
      </MainContent>
    </AppShellContainer>
  );
}
