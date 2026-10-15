import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  COMPANY_SLA_HOURS,
  DEFAULT_SLA_HOURS,
  InvalidStatusTransitionError,
  requiresPauseReason,
  resolveSlaDeadline
} from "./ticket-status-policy";

describe("ticket-status-policy.canTransition", () => {
  it("permite transições válidas a partir de TODO", () => {
    expect(canTransition("TODO", "DOING")).toBe(true);
    expect(canTransition("TODO", "PAUSED")).toBe(true);
    expect(canTransition("TODO", "DONE")).toBe(true);
  });

  it("permite reabrir um ticket DONE apenas para DOING", () => {
    expect(canTransition("DONE", "DOING")).toBe(true);
    expect(canTransition("DONE", "PAUSED")).toBe(false);
    expect(canTransition("DONE", "TODO")).toBe(false);
  });

  it("considera a transição para o mesmo status idempotente", () => {
    expect(canTransition("DOING", "DOING")).toBe(true);
  });
});

describe("ticket-status-policy.assertTransition", () => {
  it("não lança erro para transição válida", () => {
    expect(() => assertTransition("PAUSED", "DOING")).not.toThrow();
  });

  it("lança InvalidStatusTransitionError para transição inválida", () => {
    expect(() => assertTransition("DONE", "PAUSED")).toThrow(InvalidStatusTransitionError);
  });
});

describe("ticket-status-policy.requiresPauseReason", () => {
  it("exige motivo apenas para PAUSED", () => {
    expect(requiresPauseReason("PAUSED")).toBe(true);
    expect(requiresPauseReason("DOING")).toBe(false);
  });
});

describe("ticket-status-policy.resolveSlaDeadline", () => {
  const createdAt = new Date("2026-03-22T00:00:00.000Z");

  it("prioriza o solutionSlaAt quando informado", () => {
    const explicit = new Date("2026-03-22T03:00:00.000Z");
    expect(resolveSlaDeadline({ createdAt, solutionSlaAt: explicit })).toBe(explicit);
  });

  it("usa sla_horas do tipo de ticket quando disponível", () => {
    const deadline = resolveSlaDeadline({ createdAt, tipoTicketSlaHours: 2 });
    expect(deadline.getTime()).toBe(createdAt.getTime() + 2 * 60 * 60 * 1000);
  });

  it("usa o SLA por empresa quando o tipo não define horas", () => {
    const deadline = resolveSlaDeadline({ createdAt, company: "NETMITT" });
    expect(deadline.getTime()).toBe(createdAt.getTime() + COMPANY_SLA_HOURS.NETMITT * 60 * 60 * 1000);
  });

  it("cai no SLA padrão para empresa desconhecida", () => {
    const deadline = resolveSlaDeadline({ createdAt, company: "Empresa Desconhecida" });
    expect(deadline.getTime()).toBe(createdAt.getTime() + DEFAULT_SLA_HOURS * 60 * 60 * 1000);
  });
});
