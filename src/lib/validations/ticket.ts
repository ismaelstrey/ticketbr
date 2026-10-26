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
  solicitanteId: z.string().min(1).optional(),
  assunto: z.string().min(1, "Assunto é obrigatório"),
  // Campos derivados de relacionamentos podem vir nulos da leitura (mapper),
  // por isso os opcionais aceitam null explicitamente.
  descricao: z.string().nullable().optional(),
  prioridade: z.enum(["Alta", "Média", "Sem prioridade"]).optional(), // UI values
  status: z.enum(["todo", "doing", "paused", "done"]).optional(), // UI values
  operador: z.string().nullable().optional(),
  contato: z.string().nullable().optional(),
  tipoTicket: z.string().nullable().optional(),
  tipoTicketId: z.string().min(1).optional(),
  categoria: z.string().nullable().optional(),
  categoriaId: z.string().min(1).optional(),
  mesaTrabalho: z.string().nullable().optional(),
  mesaTrabalhoId: z.string().min(1).optional(),
  operadorId: z.string().min(1).optional(),
});

export const UpdateTicketSchema = CreateTicketSchema.partial().extend({
  pauseReason: z.string().nullable().optional(),
  pauseSla: z.boolean().optional(),
  // Permite limpar explicitamente os relacionamentos enviando null
  tipoTicketId: z.string().min(1).nullable().optional(),
  categoriaId: z.string().min(1).nullable().optional(),
  mesaTrabalhoId: z.string().min(1).nullable().optional(),
  operadorId: z.string().min(1).nullable().optional(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;
export type UpdateTicketInput = z.infer<typeof UpdateTicketSchema>;
