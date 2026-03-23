import { describe, expect, it } from "vitest";
import { buildChatTimeline, mergeSeparators } from "./chatTimeline";

describe("chatTimeline", () => {
  it("insere separador entre mensagens antes e depois do closedAt", () => {
    const messages = [
      { id: "m1", createdAt: "2026-03-22T10:00:00.000Z" },
      { id: "m2", createdAt: "2026-03-22T10:05:00.000Z" },
      { id: "m3", createdAt: "2026-03-22T10:10:00.000Z" }
    ];

    const separators = [
      { archivedId: "a1", closedAt: "2026-03-22T10:06:00.000Z", ticketNumber: 10 }
    ];

    const timeline = buildChatTimeline(messages, separators);

    expect(timeline.map((i) => i.kind)).toEqual(["message", "message", "separator", "message"]);
    const sep = timeline.find((i: any) => i.kind === "separator") as any;
    expect(sep.closedAt).toBe("2026-03-22T10:06:00.000Z");
    expect(sep.startAt).toBe("2026-03-22T10:10:00.000Z");
    expect(sep.ticketNumber).toBe(10);
  });

  it("coloca separador no final quando não existe mensagem após closedAt", () => {
    const messages = [
      { id: "m1", createdAt: "2026-03-22T10:00:00.000Z" }
    ];

    const separators = [
      { archivedId: "a1", closedAt: "2026-03-22T10:30:00.000Z", ticketNumber: null }
    ];

    const timeline = buildChatTimeline(messages, separators);
    expect(timeline.map((i) => i.kind)).toEqual(["message", "separator"]);
    const sep = timeline[1] as any;
    expect(sep.startAt).toBeUndefined();
  });

  it("usa startAt persistido quando fornecido", () => {
    const messages = [
      { id: "m1", createdAt: "2026-03-22T10:00:00.000Z" },
      { id: "m2", createdAt: "2026-03-22T10:10:00.000Z" }
    ];

    const separators = [
      { archivedId: "a1", closedAt: "2026-03-22T10:05:00.000Z", startAt: "2026-03-22T10:07:00.000Z", ticketNumber: null }
    ];

    const timeline = buildChatTimeline(messages, separators);
    const sep = timeline.find((i: any) => i.kind === "separator") as any;
    expect(sep.startAt).toBe("2026-03-22T10:07:00.000Z");
  });

  it("faz merge por archivedId e ordena por closedAt", () => {
    const merged = mergeSeparators(
      [
        { archivedId: "a2", closedAt: "2026-03-22T10:10:00.000Z", ticketNumber: 2 }
      ],
      [
        { archivedId: "a1", closedAt: "2026-03-22T10:05:00.000Z", ticketNumber: 1 },
        { archivedId: "a2", closedAt: "2026-03-22T10:10:00.000Z", ticketNumber: 22 }
      ]
    );

    expect(merged.map((s) => s.archivedId)).toEqual(["a1", "a2"]);
    expect(merged.find((s) => s.archivedId === "a2")?.ticketNumber).toBe(22);
  });
});
