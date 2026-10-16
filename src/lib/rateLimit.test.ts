import { beforeEach, describe, expect, it, vi } from "vitest";
import { FixedWindowRateLimiter, MemoryRateLimitStore, ProgressiveLoginGuard } from "@/lib/rateLimit";

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

  it("falls back to permissive mode when store fails during consume", async () => {
    const limiter = new FixedWindowRateLimiter(5, 60_000, {
      incrementAndGetWindow: vi.fn(async () => {
        throw new Error("store unavailable");
      }),
      reset: vi.fn(async () => undefined),
    });

    const result = await limiter.consume("ip-1");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(5);
  });

  it("does not throw when store fails during reset", async () => {
    const limiter = new FixedWindowRateLimiter(1, 60_000, {
      incrementAndGetWindow: vi.fn(async () => ({ count: 1, resetAt: Date.now() + 60_000 })),
      reset: vi.fn(async () => {
        throw new Error("reset failed");
      }),
    });

    await expect(limiter.reset("ip-1")).resolves.toBeUndefined();
  });
});

describe("ProgressiveLoginGuard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  // Cria um guard com limite e passos de bloqueio previsíveis para os testes
  function createGuard(maxFailures = 3, stepsMs = [60_000, 300_000]) {
    return new ProgressiveLoginGuard(maxFailures, 60_000, stepsMs, new MemoryRateLimitStore());
  }

  it("starts unlocked with zero failures", async () => {
    const guard = createGuard();
    const status = await guard.status("user@test.com");

    expect(status.locked).toBe(false);
    expect(status.failures).toBe(0);
  });

  it("counts failures without locking below the threshold", async () => {
    const guard = createGuard(3);

    const first = await guard.registerFailure("user@test.com");
    expect(first.locked).toBe(false);
    expect(first.failures).toBe(1);

    const second = await guard.registerFailure("user@test.com");
    expect(second.locked).toBe(false);
    expect(second.failures).toBe(2);
  });

  it("locks with the first step duration once the threshold is reached", async () => {
    const guard = createGuard(2, [60_000, 300_000]);

    await guard.registerFailure("user@test.com");
    const locked = await guard.registerFailure("user@test.com");

    expect(locked.locked).toBe(true);
    expect(locked.retryAfterSeconds).toBe(60);
    expect(locked.failures).toBe(2);
  });

  it("escalates the lock duration on subsequent failures, capped at the last step", async () => {
    const guard = createGuard(1, [60_000, 300_000]);

    const firstLock = await guard.registerFailure("user@test.com");
    expect(firstLock.retryAfterSeconds).toBe(60);

    const secondLock = await guard.registerFailure("user@test.com");
    expect(secondLock.retryAfterSeconds).toBe(300);

    const thirdLock = await guard.registerFailure("user@test.com");
    expect(thirdLock.retryAfterSeconds).toBe(300);
  });

  it("reports locked status while the lock is active and unlocks after it expires", async () => {
    const guard = createGuard(1, [60_000]);
    await guard.registerFailure("user@test.com");

    const active = await guard.status("user@test.com");
    expect(active.locked).toBe(true);
    expect(active.retryAfterSeconds).toBeGreaterThan(0);

    vi.advanceTimersByTime(60_001);

    const expired = await guard.status("user@test.com");
    expect(expired.locked).toBe(false);
  });

  it("clears failures and lock on reset", async () => {
    const guard = createGuard(1, [60_000]);
    await guard.registerFailure("user@test.com");
    expect((await guard.status("user@test.com")).locked).toBe(true);

    await guard.reset("user@test.com");

    const status = await guard.status("user@test.com");
    expect(status.locked).toBe(false);
    expect(status.failures).toBe(0);
  });

  it("isolates failures per account key", async () => {
    const guard = createGuard(1, [60_000]);
    await guard.registerFailure("a@test.com");

    const other = await guard.status("b@test.com");
    expect(other.locked).toBe(false);
    expect(other.failures).toBe(0);
  });

  it("falls back to permissive mode when the store fails", async () => {
    const guard = new ProgressiveLoginGuard(1, 60_000, [60_000], {
      incrementAndGetWindow: vi.fn(async () => {
        throw new Error("store unavailable");
      }),
      reset: vi.fn(async () => {
        throw new Error("store unavailable");
      }),
    });

    const failure = await guard.registerFailure("user@test.com");
    expect(failure.locked).toBe(false);

    const status = await guard.status("user@test.com");
    expect(status.locked).toBe(false);

    await expect(guard.reset("user@test.com")).resolves.toBeUndefined();
  });
});
