import { describe, expect, it } from "vitest";
import {
  fromPrismaPriority,
  fromPrismaStatus,
  toPrismaPriority,
  toPrismaStatus,
  type DbPriority,
  type DbStatus,
  type UiPriority,
  type UiStatus
} from "@/server/ticket-mappers";

// Garante a conversão bidirecional entre os valores da UI e os enums do Prisma
describe("ticket-mappers", () => {
  it("converte status da UI para o enum do banco", () => {
    expect(toPrismaStatus("todo")).toBe("TODO");
    expect(toPrismaStatus("doing")).toBe("DOING");
    expect(toPrismaStatus("paused")).toBe("PAUSED");
    expect(toPrismaStatus("done")).toBe("DONE");
  });

  it("converte status do banco para o valor da UI", () => {
    expect(fromPrismaStatus("TODO")).toBe("todo");
    expect(fromPrismaStatus("DOING")).toBe("doing");
    expect(fromPrismaStatus("PAUSED")).toBe("paused");
    expect(fromPrismaStatus("DONE")).toBe("done");
  });

  it("converte prioridade da UI para o enum do banco", () => {
    expect(toPrismaPriority("Alta")).toBe("HIGH");
    expect(toPrismaPriority("Média")).toBe("MEDIUM");
    expect(toPrismaPriority("Sem prioridade")).toBe("NONE");
  });

  it("converte prioridade do banco para o valor da UI", () => {
    expect(fromPrismaPriority("HIGH")).toBe("Alta");
    expect(fromPrismaPriority("MEDIUM")).toBe("Média");
    expect(fromPrismaPriority("NONE")).toBe("Sem prioridade");
  });

  it("mantém o round-trip de status e prioridade sem perdas", () => {
    const statuses: UiStatus[] = ["todo", "doing", "paused", "done"];
    statuses.forEach((status) => {
      expect(fromPrismaStatus(toPrismaStatus(status) as DbStatus)).toBe(status);
    });

    const priorities: UiPriority[] = ["Alta", "Média", "Sem prioridade"];
    priorities.forEach((priority) => {
      expect(fromPrismaPriority(toPrismaPriority(priority) as DbPriority)).toBe(priority);
    });
  });
});
