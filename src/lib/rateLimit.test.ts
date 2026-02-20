import { beforeEach, describe, expect, it, vi } from "vitest";
import { FixedWindowRateLimiter } from "@/lib/rateLimit";

describe("FixedWindowRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("tracks remaining requests", () => {
    const limiter = new FixedWindowRateLimiter(2, 60_000);

    const first = limiter.consume("ip-1");
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(1);

    const second = limiter.consume("ip-1");
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks after limit is exceeded and returns retryAfter", () => {
    const limiter = new FixedWindowRateLimiter(2, 60_000);

    limiter.consume("ip-1");
    limiter.consume("ip-1");

    const blocked = limiter.consume("ip-1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after window elapses", () => {
    const limiter = new FixedWindowRateLimiter(1, 10_000);

    expect(limiter.consume("ip-1").allowed).toBe(true);
    expect(limiter.consume("ip-1").allowed).toBe(false);

    vi.advanceTimersByTime(10_000);

    expect(limiter.consume("ip-1").allowed).toBe(true);
  });

  it("can be manually reset", () => {
    const limiter = new FixedWindowRateLimiter(1, 60_000);

    expect(limiter.consume("ip-1").allowed).toBe(true);
    expect(limiter.consume("ip-1").allowed).toBe(false);

    limiter.reset("ip-1");

    expect(limiter.consume("ip-1").allowed).toBe(true);
  });
});
