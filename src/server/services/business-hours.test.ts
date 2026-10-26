import { describe, expect, it } from "vitest";
import {
  HORARIO_COMERCIAL_PADRAO,
  addBusinessHours,
  parseHorarioComercial,
  type HorarioComercialConfig
} from "./business-hours";

/**
 * Cenários usam America/Sao_Paulo (UTC-3, sem horário de verão desde 2019).
 * 2026-06-01 é segunda-feira; 2026-06-06/07 são sábado/domingo.
 */
const CONFIG: HorarioComercialConfig = { ...HORARIO_COMERCIAL_PADRAO };

const local = (iso: string) => new Date(iso);

describe("business-hours.parseHorarioComercial", () => {
  it("normaliza uma configuração válida e mescla os feriados", () => {
    const config = parseHorarioComercial(
      { timezone: "America/Sao_Paulo", diasUteis: [5, 1, 1, 3], inicio: "09:00", fim: "18:00" },
      ["2026-01-01", "inválido", "2026-12-25"]
    );

    expect(config).toEqual({
      timezone: "America/Sao_Paulo",
      diasUteis: [1, 3, 5],
      inicio: "09:00",
      fim: "18:00",
      feriados: ["2026-01-01", "2026-12-25"]
    });
  });

  it("retorna null para configurações inconsistentes", () => {
    expect(parseHorarioComercial(null)).toBeNull();
    expect(parseHorarioComercial({})).toBeNull();
    expect(parseHorarioComercial({ timezone: "Fuso/Inexistente", diasUteis: [1], inicio: "09:00", fim: "18:00" })).toBeNull();
    expect(parseHorarioComercial({ timezone: "America/Sao_Paulo", diasUteis: [], inicio: "09:00", fim: "18:00" })).toBeNull();
    expect(parseHorarioComercial({ timezone: "America/Sao_Paulo", diasUteis: [1], inicio: "18:00", fim: "09:00" })).toBeNull();
    expect(parseHorarioComercial({ timezone: "America/Sao_Paulo", diasUteis: [1], inicio: "9h", fim: "18:00" })).toBeNull();
  });
});

describe("business-hours.addBusinessHours", () => {
  it("soma as horas dentro da mesma janela", () => {
    // Segunda 10:00 local (13:00Z) + 4h = 14:00 local (17:00Z)
    const deadline = addBusinessHours(local("2026-06-01T13:00:00.000Z"), 4, CONFIG);
    expect(deadline.toISOString()).toBe("2026-06-01T17:00:00.000Z");
  });

  it("transborda para o próximo dia útil mantendo as horas úteis", () => {
    // Segunda 16:00 local (19:00Z) + 4h = 2h úteis na segunda + 2h na terça (11:00 local)
    const deadline = addBusinessHours(local("2026-06-01T19:00:00.000Z"), 4, CONFIG);
    expect(deadline.toISOString()).toBe("2026-06-02T14:00:00.000Z");
  });

  it("pula o fim de semana", () => {
    // Sexta 17:00 local (20:00Z) + 4h = 1h na sexta + 3h na segunda (12:00 local)
    const deadline = addBusinessHours(local("2026-06-05T20:00:00.000Z"), 4, CONFIG);
    expect(deadline.toISOString()).toBe("2026-06-08T15:00:00.000Z");
  });

  it("inicia no fim de semana e começa a contar na segunda", () => {
    // Sábado 12:00 local (15:00Z) + 2h = segunda 11:00 local
    const deadline = addBusinessHours(local("2026-06-06T15:00:00.000Z"), 2, CONFIG);
    expect(deadline.toISOString()).toBe("2026-06-08T14:00:00.000Z");
  });

  it("respeita feriados configurados", () => {
    const config: HorarioComercialConfig = { ...CONFIG, feriados: ["2026-06-01"] };
    // Segunda (feriado) 10:00 local (13:00Z) + 2h = terça 11:00 local
    const deadline = addBusinessHours(local("2026-06-01T13:00:00.000Z"), 2, config);
    expect(deadline.toISOString()).toBe("2026-06-02T14:00:00.000Z");
  });

  it("avança até o início da janela quando o instante é anterior", () => {
    // Segunda 07:00 local (10:00Z) + 1h = segunda 10:00 local (13:00Z)
    const deadline = addBusinessHours(local("2026-06-01T10:00:00.000Z"), 1, CONFIG);
    expect(deadline.toISOString()).toBe("2026-06-01T13:00:00.000Z");
  });

  it("não altera o instante para horas não positivas ou configuração inválida", () => {
    const start = local("2026-06-01T13:00:00.000Z");
    expect(addBusinessHours(start, 0, CONFIG).toISOString()).toBe(start.toISOString());
    expect(addBusinessHours(start, -3, CONFIG).toISOString()).toBe(start.toISOString());

    const invalida: HorarioComercialConfig = { ...CONFIG, inicio: "18:00", fim: "09:00" };
    expect(addBusinessHours(start, 4, invalida).toISOString()).toBe(start.toISOString());
  });
});
