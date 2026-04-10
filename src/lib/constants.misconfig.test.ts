import { describe, expect, it, vi } from "vitest";

describe("constants (misconfig)", () => {
  it("não quebra import quando JWT_SECRET está ausente", async () => {
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "";
    vi.resetModules();

    const mod = await import("./constants");
    expect(mod.getJwtSecret()).toBeNull();
    expect(mod.getJwtKey()).toBeNull();

    process.env.JWT_SECRET = previous;
  });
});

