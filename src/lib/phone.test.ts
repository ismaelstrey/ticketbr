import { describe, expect, it } from "vitest";
import { formatPhone } from "@/lib/phone";

// Garante a máscara de telefone aplicada nos formulários de solicitante e contato
describe("formatPhone", () => {
  it("formata telefone fixo com DDD", () => {
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("formata celular com DDD", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("remove caracteres não numéricos antes de formatar", () => {
    expect(formatPhone("+55 (11) 98765-4321")).toBe("(55) 11987-6543");
  });

  it("limita a formatação a 11 dígitos", () => {
    expect(formatPhone("119876543219999")).toBe("(11) 98765-4321");
  });

  it("mantém apenas o DDD quando não há número suficiente", () => {
    expect(formatPhone("11")).toBe("(11) ");
  });

  it("retorna string vazia para entrada sem dígitos", () => {
    expect(formatPhone("")).toBe("");
    expect(formatPhone("abc")).toBe("");
  });
});
