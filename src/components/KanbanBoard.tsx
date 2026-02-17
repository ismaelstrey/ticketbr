"use client";

import type { DragEvent } from "react";
import {
  FiAlertCircle,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiGrid,
  FiHash,
  FiHelpCircle,
  FiHome,
  FiList,
  FiPauseCircle,
  FiSearch,
  FiSettings,
  FiTool,
  FiUser,
  FiUsers,
  FiWifi,
  FiZap
} from "@/components/icons";
import TicketDetailsView from "@/components/TicketDetailsView";
import { columns, tickets as initialTickets } from "@/data/tickets";
import { useTicketDragDrop } from "@/hooks/useTicketDragDrop";
import { useTicketEditor } from "@/hooks/useTicketEditor";
import { useTicketFilters } from "@/hooks/useTicketFilters";
import { Ticket, TicketPriority } from "@/types/ticket";

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cssClass =
    priority === "Alta" ? "priority high" : priority === "Média" ? "priority medium" : "priority";

  return <span className={cssClass}>{priority}</span>;
}

function TicketCard({
  ticket,
  onDragStart,
  onDragEnd,
  onOpen
}: {
  ticket: Ticket;
  onDragStart: (event: DragEvent<HTMLElement>, ticketId: number) => void;
  onDragEnd: () => void;
  onOpen: (ticketId: number) => void;
}) {
  return (
    <article
      className="ticket-card"
      draggable
      onDragStart={(event) => onDragStart(event, ticket.id)}
      onDragEnd={onDragEnd}
      role="button"
      onClick={() => onOpen(ticket.id)}
      aria-label={`Ticket ${ticket.id}`}
    >
      <p className="ticket-id">
        <FiHash aria-hidden="true" /> {ticket.id}
      </p>
      <p className="empresa">{ticket.empresa}</p>
      <p className="solicitante">
        <FiUser aria-hidden="true" /> {ticket.solicitante}
      </p>
      <p className="assunto">
        <FiTool aria-hidden="true" /> {ticket.assunto}
      </p>
      <div className="meta">
        <PriorityBadge priority={ticket.prioridade} />
        <span>
          <FiClock aria-hidden="true" /> {ticket.data}
        </span>
      </div>
      <div className="progress-row">
        <progress max={100} value={ticket.progressoSla} />
        <progress max={100} value={ticket.progressoTarefa} />
      </div>
    </article>
  );
}

const menuIcons = [
  FiHome,
  FiSearch,
  FiGrid,
  FiList,
  FiUsers,
  FiBookOpen,
  FiWifi,
  FiZap,
  FiSettings,
  FiHelpCircle,
  FiAlertCircle
];

const actionButtons = [
  { label: "Ticket", icon: FiTool },
  { label: "Tarefa", icon: FiCheckCircle },
  { label: "Filtros", icon: FiFilter },
  { label: "Ajuda", icon: FiHelpCircle },
  { label: "Universidade", icon: FiBookOpen }
];

const columnIcons = {
  todo: FiAlertCircle,
  doing: FiZap,
  paused: FiPauseCircle,
  done: FiCheckCircle
} as const;

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
  } = useTicketDragDrop(initialTickets);

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
    avgSla
  } = useTicketFilters(tickets);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="logo">m</div>
        {menuIcons.map((Icon, index) => (
          <button key={index} aria-label={`menu-${index + 1}`} className="menu-icon" type="button">
            <Icon aria-hidden="true" />
          </button>
        ))}
      </aside>

      <section className="content">
        {selectedTicket ? (
          <TicketDetailsView
            ticket={selectedTicket}
            onBack={closeTicket}
            onChange={updateSelectedTicket}
            onSave={closeTicket}
          />
        ) : (
          <>
            <header className="topbar">
              <div className="search-wrap">
                <FiSearch aria-hidden="true" />
                <input
                  className="search"
                  placeholder="Buscar ticket, empresa ou assunto"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="actions">
                {actionButtons.map(({ label, icon: Icon }) => (
                  <button key={label} className="pill-button" type="button">
                    <Icon aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </header>

            <section className="kpis">
              <article>
                <p>Tickets visíveis</p>
                <strong>{filteredTickets.length}</strong>
              </article>
              <article>
                <p>Em aberto</p>
                <strong>{totalOpen}</strong>
              </article>
              <article>
                <p>Média SLA</p>
                <strong>{avgSla}%</strong>
              </article>
            </section>

            <div className="filters-line">
              <h1>Tickets • Listagem de Tickets</h1>
              <div className="filter-group">
                <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}>
                  <option value="all">Prioridade: Todas</option>
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Sem prioridade">Sem prioridade</option>
                </select>
                <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                  <option value="all">Status: Todos</option>
                  <option value="todo">A fazer</option>
                  <option value="doing">Atendendo</option>
                  <option value="paused">Pausado</option>
                  <option value="done">Finalizado</option>
                </select>
              </div>
            </div>

            <section className="kanban-grid">
              {columns.map((column) => {
                const columnTickets = filteredTickets.filter((ticket) => ticket.status === column.key);
                const ColumnIcon = columnIcons[column.key];

                return (
                  <article
                    key={column.key}
                    className={`kanban-column${dragOverColumn === column.key ? " drag-over" : ""}`}
                    onDragOver={(event) => onColumnDragOver(event, column.key)}
                    onDragLeave={(event) => {
                      if (event.currentTarget === event.target) {
                        setDragOverColumn(null);
                      }
                    }}
                    onDrop={(event) => onColumnDrop(event, column.key)}
                  >
                    <header className="column-header" style={{ backgroundColor: column.color }}>
                      <div>
                        <h2>{column.title}</h2>
                        <p>{columnTickets.length}</p>
                      </div>
                      <span className="column-icon">
                        <ColumnIcon aria-hidden="true" />
                      </span>
                    </header>

                    <div className="column-cards">
                      {columnTickets.length > 0 ? (
                        columnTickets.map((ticket) => (
                          <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            onDragStart={onTicketDragStart}
                            onDragEnd={onTicketDragEnd}
                            onOpen={openTicket}
                          />
                        ))
                      ) : (
                        <p className="empty-column">Sem tickets para os filtros selecionados.</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        )}

        {pauseModalTicket ? (
          <div className="pause-modal-overlay" role="dialog" aria-modal="true">
            <div className="pause-modal">
              <header>
                <h3>
                  Pausar ticket #{pauseModalTicket.id} - {pauseModalTicket.assunto}
                </h3>
                <button type="button" className="ghost-button" onClick={closePauseModal}>
                  Fechar
                </button>
              </header>

              <p className="pause-modal-subtitle">
                Informe o motivo da pausa para registrar no ticket antes de mover para a coluna Pausado.
              </p>

              <textarea
                placeholder="Descreva o motivo da pausa do ticket..."
                value={pauseReason}
                onChange={(event) => setPauseReason(event.target.value)}
              />

              <div className="pause-modal-actions">
                <button type="button" className="ghost-button" onClick={closePauseModal}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="save-button"
                  onClick={confirmPause}
                  disabled={!pauseReason.trim()}
                >
                  Confirmar pausa
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
