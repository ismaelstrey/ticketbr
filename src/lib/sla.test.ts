import { describe, expect, it } from "vitest";
import { getSlaColor, getSlaLabel, getSlaTone } from "@/lib/sla";

// Valida as faixas de progresso do SLA usadas nos chips e badges da interface
describe("getSlaTone", () => {
  it("retorna ok abaixo de 70% do prazo consumido", () => {
    expect(getSlaTone(0)).toBe("ok");
    expect(getSlaTone(69.9)).toBe("ok");
  });

  it("retorna warning a partir de 70%", () => {
    expect(getSlaTone(70)).toBe("warning");
    expect(getSlaTone(84.9)).toBe("warning");
  });

  it("retorna danger a partir de 85%", () => {
    expect(getSlaTone(85)).toBe("danger");
    expect(getSlaTone(99.9)).toBe("danger");
  });

  it("retorna breach ao atingir ou passar de 100%", () => {
    expect(getSlaTone(100)).toBe("breach");
    expect(getSlaTone(150)).toBe("breach");
  });
});

describe("getSlaLabel", () => {
  it("traduz cada tom para o rótulo em português", () => {
    expect(getSlaLabel(10)).toBe("SLA dentro do prazo");
    expect(getSlaLabel(75)).toBe("SLA em atenção");
    expect(getSlaLabel(90)).toBe("SLA crítico");
    expect(getSlaLabel(120)).toBe("SLA rompido");
  });
});

describe("getSlaColor", () => {
  it("associa uma cor hexadecimal distinta para cada tom", () => {
    expect(getSlaColor(10)).toBe("#22c55e");
    expect(getSlaColor(75)).toBe("#f59e0b");
    expect(getSlaColor(90)).toBe("#ef4444");
    expect(getSlaColor(120)).toBe("#dc2626");
  });
});
