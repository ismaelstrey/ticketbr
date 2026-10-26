import { z } from "zod";

const dateString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Data inválida");

export const ContractStatusSchema = z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"]);
export const SlaTermScopeSchema = z.enum(["TIPO_TICKET", "CATEGORIA", "PRIORIDADE", "GLOBAL"]);
export const TicketPrioritySchema = z.enum(["HIGH", "MEDIUM", "NONE"]);

export const ContratoListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: ContractStatusSchema.optional(),
  solicitanteId: z.string().trim().min(1).optional(),
  vigenteEm: dateString.optional(),
  vencendoAte: dateString.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20)
});

export const ContratoTermoSchema = z.object({
  escopo: SlaTermScopeSchema,
  tipoTicketId: z.string().trim().min(1).nullable().optional(),
  categoriaId: z.string().trim().min(1).nullable().optional(),
  prioridade: TicketPrioritySchema.nullable().optional(),
  slaRespostaHoras: z.number().int().positive().nullable().optional(),
  slaSolucaoHoras: z.number().int().positive(),
  ativo: z.boolean().optional()
});

export const ContratoCreateSchema = z.object({
  numero: z.string().trim().min(1).max(60),
  titulo: z.string().trim().min(2).max(200),
  descricao: z.string().trim().max(20_000).nullable().optional(),
  solicitanteId: z.string().trim().min(1).nullable().optional(),
  slaPolicyId: z.string().trim().min(1).nullable().optional(),
  slaRespostaHoras: z.number().int().positive().nullable().optional(),
  slaSolucaoHoras: z.number().int().positive().nullable().optional(),
  inicioVigencia: dateString,
  fimVigencia: dateString.nullable().optional(),
  renovacaoAutomatica: z.boolean().optional(),
  diasAvisoVencimento: z.array(z.number().int().positive().max(365)).optional(),
  valorMensal: z.union([z.number(), z.string().trim().min(1)]).nullable().optional(),
  penalidadeDescricao: z.string().trim().max(20_000).nullable().optional(),
  documentoUrl: z.string().trim().max(2_000).nullable().optional(),
  observacoes: z.string().trim().max(20_000).nullable().optional(),
  termos: z.array(ContratoTermoSchema).optional()
});

export const ContratoUpdateSchema = ContratoCreateSchema.partial();

export const ContratoVincularSchema = z.object({
  solicitanteId: z.string().trim().min(1).nullable()
});

export const ContratoCancelarSchema = z.object({
  motivo: z.string().trim().min(3).max(2_000)
});

export const ContratoRenovarSchema = z.object({
  numero: z.string().trim().min(1).max(60).optional(),
  inicioVigencia: dateString.optional(),
  fimVigencia: dateString.nullable().optional(),
  valorMensal: z.union([z.number(), z.string().trim().min(1)]).nullable().optional(),
  observacoes: z.string().trim().max(20_000).nullable().optional()
});

export const ContratoTermoUpdateSchema = ContratoTermoSchema.partial();

export const SlaPreviewSchema = z.object({
  tipoTicketId: z.string().trim().min(1).nullable().optional(),
  categoriaId: z.string().trim().min(1).nullable().optional(),
  prioridade: TicketPrioritySchema.nullable().optional(),
  tipoTicketSlaHours: z.number().int().positive().nullable().optional()
});

const horaMinuto = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:mm");

/** Janela de horário comercial aplicada ao cálculo do SLA em horas úteis. */
export const HorarioComercialSchema = z.object({
  timezone: z.string().trim().min(1).max(80),
  diasUteis: z.array(z.number().int().min(0).max(6)).min(1),
  inicio: horaMinuto,
  fim: horaMinuto
});

export const SlaPolicySchema = z.object({
  nome: z.string().trim().min(2).max(120).optional(),
  descricao: z.string().trim().max(20_000).nullable().optional(),
  slaRespostaHoras: z.number().int().positive().nullable().optional(),
  slaSolucaoHoras: z.number().int().positive(),
  alertaAtencaoPct: z.number().int().min(1).max(100).optional(),
  alertaCriticoPct: z.number().int().min(1).max(100).optional(),
  horarioComercialAtivo: z.boolean().optional(),
  horarioComercial: HorarioComercialSchema.nullable().optional(),
  feriados: z.array(z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato aaaa-mm-dd")).nullable().optional()
});
