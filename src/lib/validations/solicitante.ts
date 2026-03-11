import { z } from "zod";
import { onlyDigits, validateCpf, validateCnpj } from "@/lib/cpfCnpj";

export const CreateSolicitanteSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório"),
  cpfCnpj: z
    .string()
    .min(11, "CPF/CNPJ é obrigatório")
    .transform((v) => onlyDigits(v))
    .refine((v) => v.length === 11 || v.length === 14, "CPF/CNPJ deve ter 11 ou 14 dígitos")
    .refine((v) => (v.length === 11 ? validateCpf(v) : validateCnpj(v)), "CPF/CNPJ inválido"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(8, "Telefone é obrigatório").transform((v) => onlyDigits(v)),
  enderecoCompleto: z.string().min(5, "Endereço completo é obrigatório"),
});

export const UpdateSolicitanteSchema = CreateSolicitanteSchema.partial();

export type CreateSolicitanteInput = z.infer<typeof CreateSolicitanteSchema>;
export type UpdateSolicitanteInput = z.infer<typeof UpdateSolicitanteSchema>;
