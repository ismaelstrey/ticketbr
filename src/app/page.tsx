const columns = [
  {
    key: "todo",
    title: "A fazer",
    count: 3,
    color: "#ff5d5d",
    tickets: [
      {
        id: 2391,
        empresa: "NETMITT",
        solicitante: "João Vitor Lisboa",
        assunto: "Queda total de conectividade no bairro Centro",
        prioridade: "Alta",
        data: "17/02/2026 08:30",
        progressoSla: 72,
        progressoTarefa: 15
      },
      {
        id: 2389,
        empresa: "LP INTERNET",
        solicitante: "Lucas",
        assunto: "Cliente sem acesso PPPoE após troca de roteador",
        prioridade: "Média",
        data: "16/02/2026 17:44",
        progressoSla: 45,
        progressoTarefa: 25
      },
      {
        id: 2388,
        empresa: "ACEM PRIME SERVIÇOS",
        solicitante: "Cynthia",
        assunto: "Acompanhamento de ativação técnica",
        prioridade: "Sem prioridade",
        data: "16/02/2026 16:10",
        progressoSla: 20,
        progressoTarefa: 10
      }
    ]
  },
  {
    key: "doing",
    title: "Atendendo",
    count: 2,
    color: "#69cf57",
    tickets: [
      {
        id: 2384,
        empresa: "ACEM PRIME SERVIÇOS DE INTERNET LTDA",
        solicitante: "Cynthia",
        assunto: "Acompanhamento diário",
        prioridade: "Sem prioridade",
        data: "17/02/2026 03:00",
        progressoSla: 48,
        progressoTarefa: 52
      },
      {
        id: 2376,
        empresa: "NETFIBRA",
        solicitante: "Marina",
        assunto: "Cliente sem comunicação com OLT NH",
        prioridade: "Média",
        data: "16/02/2026 18:55",
        progressoSla: 63,
        progressoTarefa: 45
      }
    ]
  },
  {
    key: "paused",
    title: "Pausado",
    count: 4,
    color: "#f2c445",
    tickets: [
      {
        id: 2381,
        empresa: "LP INTERNET",
        solicitante: "Fabrício",
        assunto: "LINK IP SUL CONNECT",
        prioridade: "Sem prioridade",
        data: "14/02/2026 15:59",
        progressoSla: 50,
        progressoTarefa: 50
      },
      {
        id: 2334,
        empresa: "ACEM PRIME SERVIÇOS DE INTERNET LTDA",
        solicitante: "Cynthia",
        assunto: "ATIVAÇÃO | Bourbon Shopping 19/02",
        prioridade: "Alta",
        data: "05/02/2026 20:57",
        progressoSla: 84,
        progressoTarefa: 84
      }
    ]
  },
  {
    key: "done",
    title: "Finalizado",
    count: 2099,
    color: "#8e8e8e",
    tickets: [
      {
        id: 2383,
        empresa: "NETMITT",
        solicitante: "João Vitor Lisboa",
        assunto: "Perca de comunicação com OLT NH",
        prioridade: "Médio",
        data: "16/02/2026 16:44",
        progressoSla: 100,
        progressoTarefa: 100
      },
      {
        id: 2382,
        empresa: "ACEM PRIME SERVIÇOS DE INTERNET LTDA",
        solicitante: "Cynthia",
        assunto: "Acompanhamento diário",
        prioridade: "Sem prioridade",
        data: "16/02/2026 03:00",
        progressoSla: 100,
        progressoTarefa: 100
      }
    ]
  }
];

function PriorityBadge({ prioridade }: { prioridade: string }) {
  const className = prioridade.toLowerCase().includes("alta")
    ? "priority high"
    : prioridade.toLowerCase().includes("méd")
      ? "priority medium"
      : "priority";

  return <span className={className}>{prioridade}</span>;
}

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="logo">m</div>
        {Array.from({ length: 11 }).map((_, index) => (
          <button key={index} aria-label={`menu-${index + 1}`} className="menu-icon" />
        ))}
      </aside>

      <section className="content">
        <header className="topbar">
          <input className="search" placeholder="Buscar" />
          <div className="actions">
            {[
              "Ticket",
              "Tarefa",
              "Filtros",
              "Ajuda",
              "Universidade"
            ].map((item) => (
              <button key={item} className="pill-button">
                {item}
              </button>
            ))}
          </div>
        </header>

        <div className="filters-line">
          <h1>Tickets • Listagem de Tickets</h1>
          <input className="search secondary" placeholder="Buscar" />
        </div>

        <section className="kanban-grid">
          {columns.map((column) => (
            <article key={column.key} className="kanban-column">
              <header className="column-header" style={{ backgroundColor: column.color }}>
                <div>
                  <h2>{column.title}</h2>
                  <p>{column.count}</p>
                </div>
                <span className="column-icon">●</span>
              </header>

              <div className="column-cards">
                {column.tickets.map((ticket) => (
                  <div className="ticket-card" key={ticket.id}>
                    <p className="ticket-id">#{ticket.id}</p>
                    <p className="empresa">{ticket.empresa}</p>
                    <p className="solicitante">{ticket.solicitante}</p>
                    <p className="assunto">{ticket.assunto}</p>
                    <div className="meta">
                      <PriorityBadge prioridade={ticket.prioridade} />
                      <span>{ticket.data}</span>
                    </div>
                    <div className="progress-row">
                      <progress max={100} value={ticket.progressoSla} />
                      <progress max={100} value={ticket.progressoTarefa} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
