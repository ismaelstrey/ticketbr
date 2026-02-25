export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  limit: number;
  resetAt: number;
};

type Entry = {
  count: number;
  resetAt: number;
};

export class FixedWindowRateLimiter {
  private readonly store = new Map<string, Entry>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  consume(key: string): RateLimitResult {
    const now = Date.now();
    const current = this.store.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + this.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        retryAfterSeconds: 0,
        remaining: Math.max(0, this.maxRequests - 1),
        limit: this.maxRequests,
        resetAt,
      };
    }

    if (current.count >= this.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      return {
        allowed: false,
        retryAfterSeconds,
        remaining: 0,
        limit: this.maxRequests,
        resetAt: current.resetAt,
      };
    }

    current.count += 1;
    this.store.set(key, current);
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, this.maxRequests - current.count),
      limit: this.maxRequests,
      resetAt: current.resetAt,
    };
  }

  reset(key: string) {
    this.store.delete(key);
  }
}

export const loginRateLimiter = new FixedWindowRateLimiter(5, 15 * 60 * 1000);
