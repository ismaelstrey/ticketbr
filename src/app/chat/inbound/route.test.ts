import { describe, expect, it } from "vitest";

describe("POST /chat/inbound", () => {
  it("reexporta o handler do /api/chat/inbound", async () => {
    const route = await import("./route");
    const apiRoute = await import("../../api/chat/inbound/route");
    expect(route.POST).toBe(apiRoute.POST);
  });
});

