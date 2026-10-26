import { describe, expect, it } from "vitest";
import { CreateTicketSchema, UpdateTicketSchema } from "@/lib/validations/ticket";

// Valida as regras de entrada dos tickets antes de chegarem ao banco
describe("CreateTicketSchema", () => {
  const basePayload = {
    empresa: "Empresa X",
    solicitante: "João",
    assunto: "Impressora sem conexão"
  };

  it("aceita o payload mínimo obrigatório", () => {
    const result = CreateTicketSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
  });

  it("rejeita quando empresa, solicitante ou assunto estão ausentes", () => {
    const result = CreateTicketSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toEqual(expect.arrayContaining(["empresa", "solicitante", "assunto"]));
    }
  });

  it("aplica a mensagem em português quando os campos obrigatórios vêm vazios", () => {
    const result = CreateTicketSchema.safeParse({ empresa: "", solicitante: "", assunto: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Empresa é obrigatória");
      expect(messages).toContain("Solicitante é obrigatório");
      expect(messages).toContain("Assunto é obrigatório");
    }
  });

  it("rejeita status de UI inválido", () => {
    const result = CreateTicketSchema.safeParse({ ...basePayload, status: "cancelado" });
    expect(result.success).toBe(false);
  });

  it("aceita os status de UI esperados", () => {
    ["todo", "doing", "paused", "done"].forEach((status) => {
      expect(CreateTicketSchema.safeParse({ ...basePayload, status }).success).toBe(true);
    });
  });

  it("rejeita IDs de relacionamento vazios", () => {
    const result = CreateTicketSchema.safeParse({ ...basePayload, tipoTicketId: "" });
    expect(result.success).toBe(false);
  });
});

describe("UpdateTicketSchema", () => {
  it("permite atualização parcial sem os campos obrigatórios", () => {
    expect(UpdateTicketSchema.safeParse({ prioridade: "Alta" }).success).toBe(true);
  });

  it("permite limpar relacionamentos enviando null", () => {
    const result = UpdateTicketSchema.safeParse({
      tipoTicketId: null,
      categoriaId: null,
      mesaTrabalhoId: null,
      operadorId: null
    });
    expect(result.success).toBe(true);
  });

  it("aceita campos derivados nulos vindos da leitura do ticket", () => {
    const result = UpdateTicketSchema.safeParse({
      operador: null,
      contato: null,
      descricao: null,
      tipoTicket: null,
      categoria: null,
      mesaTrabalho: null,
      pauseReason: null
    });
    expect(result.success).toBe(true);
  });

  it("aceita os campos de pausa do SLA", () => {
    const result = UpdateTicketSchema.safeParse({ status: "paused", pauseSla: true, pauseReason: "Aguardando cliente" });
    expect(result.success).toBe(true);
  });

  it("rejeita pauseSla com valor não booleano", () => {
    const result = UpdateTicketSchema.safeParse({ pauseSla: "sim" });
    expect(result.success).toBe(false);
  });
});
