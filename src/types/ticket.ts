export type TicketStatus = "todo" | "doing" | "paused" | "done";
export type TicketPriority = "Alta" | "Média" | "Sem prioridade";

export interface TicketInteraction {
  id: string;
  autor: string;
  tempo: string;
  mensagem: string;
  corBorda?: "azul" | "verde" | "vermelho";
}

export interface Ticket {
  id: string;
  number: number;
  empresa: string;
  solicitante: string;
  assunto: string;
  prioridade: TicketPriority;
  data: string;
  progressoSla: number;
  progressoTarefa: number;
  status: TicketStatus;
  descricao?: string;
  contato?: string;
  tipoTicket?: string;
  categoria?: string;
  mesaTrabalho?: string;
  operador?: string;
  dataCriacao?: string;
  slaResposta?: string;
  slaSolucao?: string;
  pauseReason?: string;
  interacoes?: TicketInteraction[];
}

export interface KanbanColumn {
  key: TicketStatus;
  title: string;
  color: string;
}
