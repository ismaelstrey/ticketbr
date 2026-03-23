import { describe, expect, it } from "vitest";
import { computeCurrentConversationCutoffMs, filterMessagesByCutoff } from "./chatHistoryVisibility";

describe("chatHistoryVisibility", () => {
  it("usa a última conversa finalizada como referência para cutoff", () => {
    const cutoff = computeCurrentConversationCutoffMs([
      { closedAt: "2026-03-22T10:00:00.000Z", startAt: "2026-03-22T10:01:00.000Z" },
      { closedAt: "2026-03-22T11:00:00.000Z", startAt: null }
    ]);

    expect(cutoff).toBe(new Date("2026-03-22T11:00:00.000Z").getTime() + 1);
  });

  it("prioriza startAt persistido da última conversa finalizada", () => {
    const cutoff = computeCurrentConversationCutoffMs([
      { closedAt: "2026-03-22T10:00:00.000Z", startAt: null },
      { closedAt: "2026-03-22T11:00:00.000Z", startAt: "2026-03-22T11:30:00.000Z" }
    ]);

    expect(cutoff).toBe(new Date("2026-03-22T11:30:00.000Z").getTime());
  });

  it("filtra mensagens anteriores ao cutoff", () => {
    const cutoff = new Date("2026-03-22T11:00:00.000Z").getTime();
    const messages = [
      { createdAt: "2026-03-22T10:59:59.000Z", id: "a" },
      { createdAt: "2026-03-22T11:00:00.000Z", id: "b" },
      { createdAt: "2026-03-22T11:00:01.000Z", id: "c" }
    ];

    const filtered = filterMessagesByCutoff(messages, cutoff);
    expect(filtered.map((m) => m.id)).toEqual(["b", "c"]);
  });

  it("lida com lista grande sem explodir", () => {
    const cutoff = new Date("2026-03-22T11:00:00.000Z").getTime();
    const messages = Array.from({ length: 50_000 }, (_, i) => ({
      createdAt: i < 25_000 ? "2026-03-22T10:00:00.000Z" : "2026-03-22T12:00:00.000Z"
    }));

    const filtered = filterMessagesByCutoff(messages, cutoff);
    expect(filtered.length).toBe(25_000);
  });
});

