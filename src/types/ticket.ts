export type TicketStatus = "todo" | "doing" | "paused" | "done";
export type TicketPriority = "Alta" | "Média" | "Sem prioridade";

export interface Ticket {
  id: number;
  empresa: string;
  solicitante: string;
  assunto: string;
  prioridade: TicketPriority;
  data: string;
  progressoSla: number;
  progressoTarefa: number;
  status: TicketStatus;
}

export interface KanbanColumn {
  key: TicketStatus;
  title: string;
  color: string;
}
