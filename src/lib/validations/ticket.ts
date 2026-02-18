import { z } from "zod";

export const TicketStatusSchema = z.enum(["TODO", "DOING", "PAUSED", "DONE"]);
export const TicketPrioritySchema = z.enum(["HIGH", "MEDIUM", "NONE"]);
export const TicketEventTypeSchema = z.enum([
  "CREATED",
  "STATUS_CHANGED",
  "PAUSED",
  "COMMENT",
  "NOTE",
  "ASSIGNED",
  "SLA_UPDATED",
  "UPDATED",
]);

export const CreateTicketSchema = z.object({
  empresa: z.string().min(1, "Empresa é obrigatória"),
  solicitante: z.string().min(1, "Solicitante é obrigatório"),
  assunto: z.string().min(1, "Assunto é obrigatório"),
  descricao: z.string().optional(),
  prioridade: z.enum(["Alta", "Média", "Sem prioridade"]).optional(), // UI values
  status: z.enum(["todo", "doing", "paused", "done"]).optional(), // UI values
  operador: z.string().optional(),
  contato: z.string().optional(),
  tipoTicket: z.string().optional(),
  categoria: z.string().optional(),
  mesaTrabalho: z.string().optional(),
});

export const UpdateTicketSchema = CreateTicketSchema.partial().extend({
  pauseReason: z.string().optional(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;
