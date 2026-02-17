"use client";

import { useMemo, useState } from "react";
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
} from "react-icons/fi";
import { columns, tickets } from "@/data/tickets";
import { Ticket, TicketPriority, TicketStatus } from "@/types/ticket";

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cssClass =
    priority === "Alta" ? "priority high" : priority === "Média" ? "priority medium" : "priority";

  return <span className={cssClass}>{priority}</span>;
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <article className="ticket-card">
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
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"all" | TicketPriority>("all");
  const [status, setStatus] = useState<"all" | TicketStatus>("all");

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const haystack = `${ticket.id} ${ticket.empresa} ${ticket.solicitante} ${ticket.assunto}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesPriority = priority === "all" || ticket.prioridade === priority;
      const matchesStatus = status === "all" || ticket.status === status;

      return matchesQuery && matchesPriority && matchesStatus;
    });
  }, [query, priority, status]);

  const totalOpen = filteredTickets.filter((ticket) => ticket.status !== "done").length;
  const avgSla =
    filteredTickets.length === 0
      ? 0
      : Math.round(filteredTickets.reduce((acc, ticket) => acc + ticket.progressoSla, 0) / filteredTickets.length);

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
              <article key={column.key} className="kanban-column">
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
                    columnTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
                  ) : (
                    <p className="empty-column">Sem tickets para os filtros selecionados.</p>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
