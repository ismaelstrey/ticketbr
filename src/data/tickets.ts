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
    status: "todo",
    descricao: "Cliente reportou oscilação e indisponibilidade desde a madrugada.",
    contato: "joao@netmitt.com",
    tipoTicket: "Incidente",
    categoria: "Conectividade",
    mesaTrabalho: "NOC",
    operador: "Marciano",
    dataCriacao: "17/02/2026 06:30",
    slaResposta: "17/02/2026 07:00",
    slaSolucao: "17/02/2026 12:00",
    interacoes: [
      {
        id: "2391-1",
        autor: "Marciano",
        tempo: "há 2 dias",
        mensagem: "Validação inicial concluída. Estamos verificando enlace principal.",
        corBorda: "azul"
      },
      {
        id: "2391-2",
        autor: "NOC",
        tempo: "há 1 dia",
        mensagem: "Detectada degradação em interface upstream. Escalado para campo.",
        corBorda: "verde"
      }
    ]
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
    status: "todo",
    contato: "lucas@lpinternet.com",
    tipoTicket: "Suporte",
    categoria: "PPPoE",
    mesaTrabalho: "Incidentes",
    operador: "Cynthia",
    dataCriacao: "16/02/2026 17:10",
    slaResposta: "16/02/2026 18:00",
    slaSolucao: "17/02/2026 13:00",
    interacoes: []
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
    status: "todo",
    contato: "cynthia@acem.com",
    tipoTicket: "Ativação",
    categoria: "Projeto",
    mesaTrabalho: "Implantação",
    operador: "Marciano",
    interacoes: []
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
    status: "paused",
    descricao: "Boa tarde será liberado um link IP para parceiro SUL CONNECT.",
    contato: "noc@lpinternet.com.br",
    tipoTicket: "Incidente",
    categoria: "Roteamento",
    mesaTrabalho: "Incidentes",
    operador: "Marciano",
    dataCriacao: "14/02/2026 15:59",
    slaResposta: "16/02/2026 08:30",
    slaSolucao: "20/02/2026 16:00",
    interacoes: [
      {
        id: "2381-1",
        autor: "Marciano",
        tempo: "há 2 dias",
        mensagem: "ASN validado. Aguardando retorno do cliente para janela de mudança.",
        corBorda: "azul"
      },
      {
        id: "2381-2",
        autor: "Marciano",
        tempo: "há 2 dias",
        mensagem: "Atendimento interno: revisar prefixos e rota preferencial.",
        corBorda: "verde"
      },
      {
        id: "2381-3",
        autor: "Fabrício LP Internet",
        tempo: "há 3 dias",
        mensagem: "Solicitação inicial enviada para subir link em mesma porta com rede neutra.",
        corBorda: "vermelho"
      }
    ]
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
