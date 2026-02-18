import { FiCheckCircle, FiClock, FiFilter, FiHash, FiSearch, FiTool, FiUser } from "@/components/icons";
import { Ticket, TicketPriority, TicketStatus } from "@/types/ticket";

const statusLabels: Record<TicketStatus, string> = {
  todo: "A fazer",
  doing: "Atendendo",
  paused: "Pausado",
  done: "Finalizado"
};

export default function TicketDetailsView({
  ticket,
  onBack,
  onChange,
  onSave
}: {
  ticket: Ticket;
  onBack: () => void;
  onChange: (changes: Partial<Ticket>) => void;
  onSave: () => void;
}) {
  return (
    <section className="ticket-details-view">
      <header className="detail-header">
        <button type="button" className="ghost-button" onClick={onBack}>
          ← Voltar ao Kanban
        </button>

        <div className="detail-title-wrap">
          <h2>
            <FiHash aria-hidden="true" /> {ticket.number}
          </h2>
          <input
            value={ticket.assunto}
            onChange={(event) => onChange({ assunto: event.target.value })}
            className="title-input"
          />
        </div>

        <button className="save-button" type="button" onClick={onSave}>
          <FiCheckCircle aria-hidden="true" /> Salvar
        </button>
      </header>

      <div className="detail-top-filters">
        <span>
          <FiFilter aria-hidden="true" /> Filtrar
        </span>
        <span>
          <FiSearch aria-hidden="true" /> Pesquisar
        </span>
        <span>Comentários</span>
        <span>Anexos</span>
        <span>Checklist</span>
      </div>

      <section className="detail-content-grid">
        <div className="detail-timeline">
          {(ticket.interacoes ?? []).map((item) => (
            <article key={item.id} className={`timeline-card ${item.corBorda ?? "azul"}`}>
              <p className="timeline-head">
                <strong>{item.autor}</strong> • {item.tempo}
              </p>
              <p>{item.mensagem}</p>
            </article>
          ))}
        </div>

        <aside className="detail-sidebar-form">
          <div className="detail-metric">
            <p>Data de criação</p>
            <strong>{ticket.dataCriacao ?? ticket.data}</strong>
          </div>

          <div className="detail-metric">
            <p>SLA Resposta</p>
            <strong>{ticket.slaResposta ?? "-"}</strong>
          </div>

          <div className="detail-metric">
            <p>SLA Solução</p>
            <strong>{ticket.slaSolucao ?? "-"}</strong>
          </div>

          <label>
            Prioridade
            <select
              value={ticket.prioridade}
              onChange={(event) => onChange({ prioridade: event.target.value as TicketPriority })}
            >
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Sem prioridade">Sem prioridade</option>
            </select>
          </label>

          <label>
            Status
            <select value={ticket.status} onChange={(event) => onChange({ status: event.target.value as TicketStatus })}>
              <option value="todo">{statusLabels.todo}</option>
              <option value="doing">{statusLabels.doing}</option>
              <option value="paused">{statusLabels.paused}</option>
              <option value="done">{statusLabels.done}</option>
            </select>
          </label>

          <label>
            Contatos
            <input value={ticket.contato ?? ""} onChange={(event) => onChange({ contato: event.target.value })} />
          </label>

          <label>
            Tipo de Ticket
            <input value={ticket.tipoTicket ?? ""} onChange={(event) => onChange({ tipoTicket: event.target.value })} />
          </label>

          <label>
            Categorias
            <input value={ticket.categoria ?? ""} onChange={(event) => onChange({ categoria: event.target.value })} />
          </label>

          <label>
            Mesa de Trabalho
            <input value={ticket.mesaTrabalho ?? ""} onChange={(event) => onChange({ mesaTrabalho: event.target.value })} />
          </label>

          <label>
            Operador
            <input value={ticket.operador ?? ""} onChange={(event) => onChange({ operador: event.target.value })} />
          </label>

          <label>
            Descrição
            <textarea value={ticket.descricao ?? ""} onChange={(event) => onChange({ descricao: event.target.value })} />
          </label>

          <label>
            Motivo da pausa
            <textarea
              value={ticket.pauseReason ?? ""}
              onChange={(event) => onChange({ pauseReason: event.target.value })}
              placeholder="Descreva o motivo quando o ticket estiver pausado"
            />
          </label>

          <p className="updated-at">
            <FiClock aria-hidden="true" /> Última atualização: {ticket.data}
          </p>
          <p className="updated-at">
            <FiUser aria-hidden="true" /> Solicitante: {ticket.solicitante}
          </p>
          <p className="updated-at">
            <FiTool aria-hidden="true" /> Empresa: {ticket.empresa}
          </p>
        </aside>
      </section>
    </section>
  );
}
