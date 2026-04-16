import { beforeEach, describe, expect, it, vi } from "vitest";
import { FixedWindowRateLimiter } from "@/lib/rateLimit";

describe("FixedWindowRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("tracks remaining requests", async () => {
    const limiter = new FixedWindowRateLimiter(2, 60_000);

    const first = await limiter.consume("ip-1");
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = await limiter.consume("ip-1");
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks after limit is exceeded and returns retryAfter", async () => {
    const limiter = new FixedWindowRateLimiter(2, 60_000);

    await limiter.consume("ip-1");
    await limiter.consume("ip-1");

    const blocked = await limiter.consume("ip-1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after window elapses", async () => {
    const limiter = new FixedWindowRateLimiter(1, 10_000);

    expect((await limiter.consume("ip-1")).allowed).toBe(true);
    expect((await limiter.consume("ip-1")).allowed).toBe(false);

    vi.advanceTimersByTime(10_000);

    expect((await limiter.consume("ip-1")).allowed).toBe(true);
  });

  it("can be manually reset", async () => {
    const limiter = new FixedWindowRateLimiter(1, 60_000);

    expect((await limiter.consume("ip-1")).allowed).toBe(true);
    expect((await limiter.consume("ip-1")).allowed).toBe(false);

    await limiter.reset("ip-1");

    expect((await limiter.consume("ip-1")).allowed).toBe(true);
  });
});
