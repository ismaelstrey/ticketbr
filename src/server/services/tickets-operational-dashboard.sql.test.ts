import { describe, expect, it, vi } from "vitest";

const queryRawUnsafe = vi.fn(async (sql: string) => {
  if (sql.includes("FROM \"Ticket\"")) return [];
  return [];
});

vi.mock("@/lib/prisma", () => {
  const ticket = {
    count: vi.fn(async () => 0),
    groupBy: vi.fn(async () => []),
    findMany: vi.fn(async () => []),
  };

  return {
    Prisma: {},
    prisma: {
      ticket,
      $queryRawUnsafe: queryRawUnsafe,
    },
  };
});

describe("tickets-operational-dashboard SQL", () => {
  it("não usa GROUP BY por alias ambíguo e inclui group-by posicional", async () => {
    const { getTicketsOperationalDashboard } = await import("./tickets-operational-dashboard");
    await getTicketsOperationalDashboard({ preset: "7d" } as any);

    const sqls = queryRawUnsafe.mock.calls.map((c) => String(c[0] || ""));
    expect(sqls.length).toBeGreaterThan(0);

    const categoryTrend = sqls.find((s) => s.includes("LEFT JOIN \"Categoria_Ticket\"")) || "";
    expect(categoryTrend).toMatch(/GROUP BY\s+1,\s*2/i);

    const topCategories = sqls.find((s) => s.includes("LIMIT 10") && s.includes("Sem categoria")) || "";
    expect(topCategories).toMatch(/GROUP BY\s+1/i);

    for (const s of sqls) {
      expect(/GROUP BY\s+category\b/i.test(s)).toBe(false);
      expect(/GROUP BY\s+bucket\b/i.test(s)).toBe(false);
    }
  });
});

