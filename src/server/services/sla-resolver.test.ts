import { describe, expect, it } from "vitest";
import {
  DEFAULT_SLA_HOURS,
  resolveResponseSla,
  resolveSla,
  type SlaResolutionContext
} from "./sla-resolver";

const createdAt = new Date("2026-03-22T00:00:00.000Z");
const hoursFrom = (hours: number) => createdAt.getTime() + hours * 60 * 60 * 1000;

describe("sla-resolver.resolveSla", () => {
  it("prioriza o prazo manual (solutionSlaAt) sobre qualquer configuração", () => {
    const solutionSlaAt = new Date("2026-03-22T03:00:00.000Z");

    const result = resolveSla({
      createdAt,
      solutionSlaAt,
      tipoTicketSlaHours: 2,
      contrato: { slaSolucaoHoras: 6 }
    });

    expect(result.fonte).toBe("MANUAL");
    expect(result.deadline).toBe(solutionSlaAt);
    expect(result.horas).toBe(3);
  });

  it("usa o SLA do tipo de ticket como prioridade máxima sobre o contrato", () => {
    const result = resolveSla({
      createdAt,
      tipoTicketSlaHours: 2,
      contrato: { slaSolucaoHoras: 6, termos: [{ escopo: "GLOBAL", slaSolucaoHoras: 4, ativo: true }] }
    });

    expect(result.fonte).toBe("TICKET_TYPE");
    expect(result.horas).toBe(2);
    expect(result.deadline.getTime()).toBe(hoursFrom(2));
  });

  it("ignora tipo de ticket com horas zeradas ou negativas e cai no contrato", () => {
    const result = resolveSla({
      createdAt,
      tipoTicketSlaHours: 0,
      contrato: { slaSolucaoHoras: 5 }
    });

    expect(result.fonte).toBe("CONTRACT");
    expect(result.horas).toBe(5);
  });

  it("casa o termo do contrato por tipo de ticket", () => {
    const result = resolveSla({
      createdAt,
      ticket: { tipoTicketId: "tipo-1" },
      contrato: {
        slaSolucaoHoras: 6,
        termos: [
          { escopo: "GLOBAL", slaSolucaoHoras: 8, ativo: true },
          { escopo: "TIPO_TICKET", tipoTicketId: "tipo-1", slaSolucaoHoras: 3, ativo: true }
        ]
      }
    });

    expect(result.fonte).toBe("CONTRACT_TERM");
    expect(result.horas).toBe(3);
  });

  it("respeita a ordem de especificidade: categoria > prioridade > global", () => {
    const termos = [
      { escopo: "GLOBAL" as const, slaSolucaoHoras: 10, ativo: true },
      { escopo: "PRIORIDADE" as const, prioridade: "HIGH" as const, slaSolucaoHoras: 8, ativo: true },
      { escopo: "CATEGORIA" as const, categoriaId: "cat-1", slaSolucaoHoras: 4, ativo: true }
    ];

    const porCategoria = resolveSla({
      createdAt,
      ticket: { categoriaId: "cat-1", priority: "HIGH" },
      contrato: { termos }
    });
    expect(porCategoria.horas).toBe(4);

    const porPrioridade = resolveSla({
      createdAt,
      ticket: { categoriaId: "cat-outra", priority: "HIGH" },
      contrato: { termos }
    });
    expect(porPrioridade.horas).toBe(8);

    const porGlobal = resolveSla({
      createdAt,
      ticket: { categoriaId: "cat-outra", priority: "NONE" },
      contrato: { termos }
    });
    expect(porGlobal.horas).toBe(10);
  });

  it("não casa termo cujo alvo diverge do ticket", () => {
    const result = resolveSla({
      createdAt,
      ticket: { categoriaId: "cat-1" },
      contrato: {
        slaSolucaoHoras: 6,
        termos: [{ escopo: "CATEGORIA", categoriaId: "cat-2", slaSolucaoHoras: 1, ativo: true }]
      }
    });

    expect(result.fonte).toBe("CONTRACT");
    expect(result.horas).toBe(6);
  });

  it("desconsidera termos inativos", () => {
    const result = resolveSla({
      createdAt,
      ticket: { categoriaId: "cat-1" },
      contrato: {
        slaSolucaoHoras: 6,
        termos: [{ escopo: "CATEGORIA", categoriaId: "cat-1", slaSolucaoHoras: 1, ativo: false }]
      }
    });

    expect(result.fonte).toBe("CONTRACT");
    expect(result.horas).toBe(6);
  });

  it("usa o SLA diferenciado do contrato quando não há termo aplicável", () => {
    const result = resolveSla({
      createdAt,
      contrato: { slaSolucaoHoras: 4, policy: { slaSolucaoHoras: 8 } }
    });

    expect(result.fonte).toBe("CONTRACT");
    expect(result.horas).toBe(4);
  });

  it("usa a política global herdada quando o contrato não define SLA", () => {
    const result = resolveSla({
      createdAt,
      contrato: { slaSolucaoHoras: null, policy: { slaSolucaoHoras: 12 } }
    });

    expect(result.fonte).toBe("GLOBAL_POLICY");
    expect(result.horas).toBe(12);
  });

  it("cai no SLA padrão quando não há contrato aplicável (fora de vigência)", () => {
    const semContrato = resolveSla({ createdAt, contrato: null });
    expect(semContrato.fonte).toBe("FALLBACK");
    expect(semContrato.horas).toBe(DEFAULT_SLA_HOURS);
    expect(semContrato.deadline.getTime()).toBe(hoursFrom(DEFAULT_SLA_HOURS));

    const contextoVazio: SlaResolutionContext = { createdAt };
    expect(resolveSla(contextoVazio).fonte).toBe("FALLBACK");
  });

  it("mantém horas corridas quando a política não habilita o horário comercial", () => {
    // Segunda 10:00 local (13:00Z) + 4h em horas corridas = 17:00Z
    const segunda = new Date("2026-06-01T13:00:00.000Z");
    const result = resolveSla({
      createdAt: segunda,
      contrato: {
        slaSolucaoHoras: 4,
        policy: {
          slaSolucaoHoras: 8,
          horarioComercialAtivo: false,
          horarioComercial: { timezone: "America/Sao_Paulo", diasUteis: [1, 2, 3, 4, 5], inicio: "09:00", fim: "18:00" }
        }
      }
    });

    expect(result.fonte).toBe("CONTRACT");
    expect(result.deadline.toISOString()).toBe("2026-06-01T17:00:00.000Z");
  });

  it("conta em horas úteis quando o horário comercial está habilitado", () => {
    // Sexta 17:00 local (20:00Z) + 4h úteis = 1h sexta + 3h segunda (12:00 local)
    const sexta = new Date("2026-06-05T20:00:00.000Z");
    const result = resolveSla({
      createdAt: sexta,
      contrato: {
        slaSolucaoHoras: 4,
        policy: {
          slaSolucaoHoras: 8,
          horarioComercialAtivo: true,
          horarioComercial: { timezone: "America/Sao_Paulo", diasUteis: [1, 2, 3, 4, 5], inicio: "09:00", fim: "18:00" },
          feriados: []
        }
      }
    });

    expect(result.horas).toBe(4);
    expect(result.deadline.toISOString()).toBe("2026-06-08T15:00:00.000Z");
  });

  it("ignora horário comercial inválido e volta para horas corridas", () => {
    const segunda = new Date("2026-06-01T13:00:00.000Z");
    const result = resolveSla({
      createdAt: segunda,
      contrato: {
        slaSolucaoHoras: 4,
        policy: {
          slaSolucaoHoras: 8,
          horarioComercialAtivo: true,
          horarioComercial: { timezone: "America/Sao_Paulo", diasUteis: [], inicio: "09:00", fim: "18:00" }
        }
      }
    });

    expect(result.deadline.toISOString()).toBe("2026-06-01T17:00:00.000Z");
  });
});

describe("sla-resolver.resolveResponseSla", () => {
  it("usa as horas de resposta do contrato", () => {
    const result = resolveResponseSla({
      createdAt,
      contrato: { slaRespostaHoras: 2, slaSolucaoHoras: 6 }
    });

    expect(result?.fonte).toBe("CONTRACT");
    expect(result?.horas).toBe(2);
    expect(result?.deadline.getTime()).toBe(hoursFrom(2));
  });

  it("prioriza o termo que casa com o ticket sobre o contrato", () => {
    const result = resolveResponseSla({
      createdAt,
      ticket: { tipoTicketId: "tipo-1" },
      contrato: {
        slaRespostaHoras: 8,
        termos: [
          { escopo: "GLOBAL", slaSolucaoHoras: 10, slaRespostaHoras: 5, ativo: true },
          { escopo: "TIPO_TICKET", tipoTicketId: "tipo-1", slaSolucaoHoras: 3, slaRespostaHoras: 1, ativo: true }
        ]
      }
    });

    expect(result?.fonte).toBe("CONTRACT_TERM");
    expect(result?.horas).toBe(1);
  });

  it("ignora termo sem horas de resposta e usa a política global herdada", () => {
    const result = resolveResponseSla({
      createdAt,
      contrato: {
        slaRespostaHoras: null,
        termos: [{ escopo: "GLOBAL", slaSolucaoHoras: 10, slaRespostaHoras: null, ativo: true }],
        policy: { slaSolucaoHoras: 12, slaRespostaHoras: 3 }
      }
    });

    expect(result?.fonte).toBe("GLOBAL_POLICY");
    expect(result?.horas).toBe(3);
  });

  it("não inventa prazo de resposta quando nada está configurado", () => {
    expect(resolveResponseSla({ createdAt, contrato: { slaSolucaoHoras: 6 } })).toBeNull();
    expect(resolveResponseSla({ createdAt })).toBeNull();
    expect(
      resolveResponseSla({ createdAt, contrato: { slaRespostaHoras: 0, policy: { slaSolucaoHoras: 8 } } })
    ).toBeNull();
  });

  it("conta o prazo de resposta em horas úteis quando o horário comercial está habilitado", () => {
    // Sexta 17:00 local (20:00Z) + 2h úteis = 1h sexta + 1h segunda (10:00 local)
    const sexta = new Date("2026-06-05T20:00:00.000Z");
    const result = resolveResponseSla({
      createdAt: sexta,
      contrato: {
        slaRespostaHoras: 2,
        policy: {
          slaSolucaoHoras: 8,
          horarioComercialAtivo: true,
          horarioComercial: { timezone: "America/Sao_Paulo", diasUteis: [1, 2, 3, 4, 5], inicio: "09:00", fim: "18:00" },
          feriados: []
        }
      }
    });

    expect(result?.deadline.toISOString()).toBe("2026-06-08T13:00:00.000Z");
  });
});
