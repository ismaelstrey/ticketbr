import { KanbanColumn, Ticket } from "@/types/ticket";

export const columns: KanbanColumn[] = [
  { key: "todo", title: "A fazer", color: "#ff5d5d" },
  { key: "doing", title: "Atendendo", color: "#69cf57" },
  { key: "paused", title: "Pausado", color: "#f2c445" },
  { key: "done", title: "Finalizado", color: "#8e8e8e" }
];

export const tickets: Ticket[] = [
  {
    id: 2391,
    empresa: "NETMITT",
    solicitante: "João Vitor Lisboa",
    assunto: "Queda total de conectividade no bairro Centro",
    prioridade: "Alta",
    data: "17/02/2026 08:30",
    progressoSla: 72,
    progressoTarefa: 15,
    status: "todo"
  },
  {
    id: 2389,
    empresa: "LP INTERNET",
    solicitante: "Lucas",
    assunto: "Cliente sem acesso PPPoE após troca de roteador",
    prioridade: "Média",
    data: "16/02/2026 17:44",
    progressoSla: 45,
    progressoTarefa: 25,
    status: "todo"
  },
  {
    id: 2388,
    empresa: "ACEM PRIME SERVIÇOS",
    solicitante: "Cynthia",
    assunto: "Acompanhamento de ativação técnica",
    prioridade: "Sem prioridade",
    data: "16/02/2026 16:10",
    progressoSla: 20,
    progressoTarefa: 10,
    status: "todo"
  },
  {
    id: 2384,
    empresa: "ACEM PRIME SERVIÇOS DE INTERNET LTDA",
    solicitante: "Cynthia",
    assunto: "Acompanhamento diário",
    prioridade: "Sem prioridade",
    data: "17/02/2026 03:00",
    progressoSla: 48,
    progressoTarefa: 52,
    status: "doing"
  },
  {
    id: 2376,
    empresa: "NETFIBRA",
    solicitante: "Marina",
    assunto: "Cliente sem comunicação com OLT NH",
    prioridade: "Média",
    data: "16/02/2026 18:55",
    progressoSla: 63,
    progressoTarefa: 45,
    status: "doing"
  },
  {
    id: 2381,
    empresa: "LP INTERNET",
    solicitante: "Fabrício",
    assunto: "LINK IP SUL CONNECT",
    prioridade: "Sem prioridade",
    data: "14/02/2026 15:59",
    progressoSla: 50,
    progressoTarefa: 50,
    status: "paused"
  },
  {
    id: 2334,
    empresa: "ACEM PRIME SERVIÇOS DE INTERNET LTDA",
    solicitante: "Cynthia",
    assunto: "ATIVAÇÃO | Bourbon Shopping 19/02",
    prioridade: "Alta",
    data: "05/02/2026 20:57",
    progressoSla: 84,
    progressoTarefa: 84,
    status: "paused"
  },
  {
    id: 2383,
    empresa: "NETMITT",
    solicitante: "João Vitor Lisboa",
    assunto: "Perda de comunicação com OLT NH",
    prioridade: "Média",
    data: "16/02/2026 16:44",
    progressoSla: 100,
    progressoTarefa: 100,
    status: "done"
  },
  {
    id: 2382,
    empresa: "ACEM PRIME SERVIÇOS DE INTERNET LTDA",
    solicitante: "Cynthia",
    assunto: "Acompanhamento diário",
    prioridade: "Sem prioridade",
    data: "16/02/2026 03:00",
    progressoSla: 100,
    progressoTarefa: 100,
    status: "done"
  }
];
