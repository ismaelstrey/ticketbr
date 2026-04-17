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

type RateLimitCounter = {
  count: number;
  resetAt: number;
};

interface RateLimitStore {
  incrementAndGetWindow(key: string, windowMs: number): Promise<RateLimitCounter>;
  reset(key: string): Promise<void>;
}

class MemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, Entry>();

  async incrementAndGetWindow(key: string, windowMs: number): Promise<RateLimitCounter> {
    const now = Date.now();
    const current = this.store.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + windowMs;
      this.store.set(key, { count: 1, resetAt });
      return { count: 1, resetAt };
    }

    current.count += 1;
    this.store.set(key, current);
    return { count: current.count, resetAt: current.resetAt };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class UpstashRateLimitStore implements RateLimitStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly keyPrefix: string
  ) {}

  private async command(args: Array<string | number>) {
    const response = await fetch(`${this.url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([args]),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Upstash command failed with status ${response.status}`);
    }

    const payload = (await response.json()) as Array<{ result?: unknown; error?: string }>;
    const first = payload?.[0];
    if (!first || first.error) {
      throw new Error(first?.error || "Upstash command returned an invalid response");
    }
    return first.result;
  }

  async incrementAndGetWindow(key: string, windowMs: number): Promise<RateLimitCounter> {
    const scopedKey = `${this.keyPrefix}:${key}`;
    const now = Date.now();

    const countRaw = await this.command(["INCR", scopedKey]);
    const count = Number(countRaw);
    if (!Number.isFinite(count)) {
      throw new Error("Invalid INCR result from Upstash");
    }

    let ttlMsRaw = await this.command(["PTTL", scopedKey]);
    let ttlMs = Number(ttlMsRaw);

    if (count === 1 || ttlMs <= 0) {
      await this.command(["PEXPIRE", scopedKey, windowMs]);
      ttlMsRaw = await this.command(["PTTL", scopedKey]);
      ttlMs = Number(ttlMsRaw);
    }

    const boundedTtlMs = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : windowMs;
    return {
      count,
      resetAt: now + boundedTtlMs,
    };
  }

  async reset(key: string): Promise<void> {
    const scopedKey = `${this.keyPrefix}:${key}`;
    await this.command(["DEL", scopedKey]);
  }
}

export class FixedWindowRateLimiter {
  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
    private readonly store: RateLimitStore = new MemoryRateLimitStore()
  ) {}

  async consume(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    let counter: RateLimitCounter;

    try {
      counter = await this.store.incrementAndGetWindow(key, this.windowMs);
    } catch (error) {
      console.warn("[rateLimit] Falling back to permissive mode due to store failure", {
        message: error instanceof Error ? error.message : "unknown",
      });
      return {
        allowed: true,
        retryAfterSeconds: 0,
        remaining: this.maxRequests,
        limit: this.maxRequests,
        resetAt: now + this.windowMs,
      };
    }

    if (counter.count > this.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((counter.resetAt - now) / 1000));
      return {
        allowed: false,
        retryAfterSeconds,
        remaining: 0,
        limit: this.maxRequests,
        resetAt: counter.resetAt,
      };
    }

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, this.maxRequests - counter.count),
      limit: this.maxRequests,
      resetAt: counter.resetAt,
    };
  }

  async reset(key: string): Promise<void> {
    try {
      await this.store.reset(key);
    } catch (error) {
      console.warn("[rateLimit] Failed to reset key", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }
}

function createRateLimitStore(): RateLimitStore {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const prefix = process.env.RATE_LIMIT_KEY_PREFIX?.trim() || "ticketbr:rate-limit";

  if (!url || !token) {
    return new MemoryRateLimitStore();
  }

  return new UpstashRateLimitStore(url, token, prefix);
}

export const loginRateLimiter = new FixedWindowRateLimiter(5, 15 * 60 * 1000, createRateLimitStore());
export const sensitiveRouteRateLimiter = new FixedWindowRateLimiter(30, 60 * 1000, createRateLimitStore());
