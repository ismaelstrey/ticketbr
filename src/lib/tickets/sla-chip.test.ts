import { describe, expect, it } from "vitest";
import { getPriorityChipLabel, getSlaChipLabel, getSlaToneFromProgress } from "./sla-chip";

describe("sla-chip", () => {
  it("normaliza tom de SLA por progresso", () => {
    expect(getSlaToneFromProgress(0)).toBe("safe");
    expect(getSlaToneFromProgress(69)).toBe("safe");
    expect(getSlaToneFromProgress(70)).toBe("warning");
    expect(getSlaToneFromProgress(89)).toBe("warning");
    expect(getSlaToneFromProgress(90)).toBe("danger");
    expect(getSlaToneFromProgress(99)).toBe("danger");
    expect(getSlaToneFromProgress(100)).toBe("breach");
  });

  it("mapeia tom para labels padronizadas", () => {
    expect(getSlaChipLabel("safe")).toBe("SLA dentro do prazo");
    expect(getSlaChipLabel("warning")).toBe("SLA em atenção");
    expect(getSlaChipLabel("danger")).toBe("SLA crítico");
    expect(getSlaChipLabel("breach")).toBe("SLA rompido");
  });

  it("mapeia prioridade para label padronizada", () => {
    expect(getPriorityChipLabel("Alta")).toBe("Prioridade alta");
    expect(getPriorityChipLabel("HIGH")).toBe("Prioridade alta");
    expect(getPriorityChipLabel("Média")).toBe("Prioridade média");
    expect(getPriorityChipLabel("MEDIUM")).toBe("Prioridade média");
    expect(getPriorityChipLabel("Sem prioridade")).toBe("Sem prioridade");
    expect(getPriorityChipLabel("NONE")).toBe("Sem prioridade");
  });
});
