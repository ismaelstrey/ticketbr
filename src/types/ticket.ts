export type TicketStatus = "todo" | "doing" | "paused" | "done";
export type TicketPriority = "Alta" | "Média" | "Sem prioridade";

export interface TicketInteraction {
  id: string;
  autor: string;
  tempo: string;
  mensagem: string;
  corBorda?: "azul" | "verde" | "vermelho";
}

export interface TicketRoadmapEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  fromStatus?: TicketStatus | null;
  toStatus?: TicketStatus | null;
  pauseReason?: string | null;
  pauseSla?: boolean;
  author?: string;
  createdAt: string | Date;
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
  tipoTicketId?: string | null;
  categoria?: string;
  categoriaId?: string | null;
  mesaTrabalho?: string;
  mesaTrabalhoId?: string | null;
  operador?: string;
  operadorId?: string | null;
  dataCriacao?: string;
  dataAtualizacao?: string;
  slaResposta?: string;
  slaSolucao?: string;
  pauseReason?: string;
  pauseSla?: boolean;
  pausedStartedAt?: string | null;
  pausedTotalSeconds?: number;
  interacoes?: TicketInteraction[];
  roadmap?: TicketRoadmapEvent[];
}

export interface KanbanColumn {
  key: TicketStatus;
  title: string;
  color: string;
}
