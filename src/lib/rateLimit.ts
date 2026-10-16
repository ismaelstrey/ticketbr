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

export interface RateLimitStore {
  incrementAndGetWindow(key: string, windowMs: number): Promise<RateLimitCounter>;
  reset(key: string): Promise<void>;
  get?(key: string): Promise<string | null>;
  setWithTtl?(key: string, value: string, ttlMs: number): Promise<void>;
}

type KvEntry = {
  value: string;
  expiresAt: number;
};

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, Entry>();
  private readonly kv = new Map<string, KvEntry>();

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
    this.kv.delete(key);
  }

  async get(key: string): Promise<string | null> {
    const item = this.kv.get(key);
    if (!item) {
      return null;
    }
    if (item.expiresAt <= Date.now()) {
      this.kv.delete(key);
      return null;
    }
    return item.value;
  }

  async setWithTtl(key: string, value: string, ttlMs: number): Promise<void> {
    this.kv.set(key, { value, expiresAt: Date.now() + ttlMs });
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

  async get(key: string): Promise<string | null> {
    const scopedKey = `${this.keyPrefix}:${key}`;
    const raw = await this.command(["GET", scopedKey]);
    return raw === null || raw === undefined ? null : String(raw);
  }

  async setWithTtl(key: string, value: string, ttlMs: number): Promise<void> {
    const scopedKey = `${this.keyPrefix}:${key}`;
    await this.command(["SET", scopedKey, value, "PX", Math.max(1, Math.floor(ttlMs))]);
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

export type LoginLockStatus = {
  locked: boolean;
  retryAfterSeconds: number;
  lockUntil: number;
  failures: number;
};

const FAIL_KEY_SUFFIX = "fail";
const LOCK_KEY_SUFFIX = "lock";

export const DEFAULT_LOGIN_LOCK_STEPS_MINUTES = [1, 5, 15, 60];

/**
 * Guarda de bloqueio progressivo por conta (e-mail).
 * Conta as falhas de credencial em uma janela e, ao exceder o limite,
 * aplica um bloqueio com duração crescente (1min, 5min, 15min, 60min, ...).
 */
export class ProgressiveLoginGuard {
  constructor(
    private readonly maxFailures: number,
    private readonly failureWindowMs: number,
    private readonly lockDurationStepsMs: number[],
    private readonly store: RateLimitStore
  ) {}

  private warn(action: string, error: unknown) {
    console.warn(`[rateLimit] ProgressiveLoginGuard ${action} falhou; operando em modo permissivo`, {
      message: error instanceof Error ? error.message : "unknown"
    });
  }

  private lockKey(key: string) {
    return `${key}:${LOCK_KEY_SUFFIX}`;
  }

  private failureKey(key: string) {
    return `${key}:${FAIL_KEY_SUFFIX}`;
  }

  /** Verifica se a conta está bloqueada no momento. */
  async status(key: string): Promise<LoginLockStatus> {
    try {
      const [lockRaw, failRaw] = await Promise.all([
        this.store.get ? this.store.get(this.lockKey(key)) : Promise.resolve(null),
        this.store.get ? this.store.get(this.failureKey(key)) : Promise.resolve(null)
      ]);

      const now = Date.now();
      const lockUntil = Number(lockRaw ?? 0);
      const failuresRaw = Number(failRaw ?? 0);
      const failures = Number.isFinite(failuresRaw) ? failuresRaw : 0;

      if (Number.isFinite(lockUntil) && lockUntil > now) {
        return {
          locked: true,
          retryAfterSeconds: Math.max(1, Math.ceil((lockUntil - now) / 1000)),
          lockUntil,
          failures
        };
      }

      return { locked: false, retryAfterSeconds: 0, lockUntil: 0, failures };
    } catch (error) {
      this.warn("status", error);
      return { locked: false, retryAfterSeconds: 0, lockUntil: 0, failures: 0 };
    }
  }

  /** Registra uma falha de credencial e aplica bloqueio progressivo se necessário. */
  async registerFailure(key: string): Promise<LoginLockStatus> {
    try {
      const counter = await this.store.incrementAndGetWindow(this.failureKey(key), this.failureWindowMs);
      const failures = counter.count;

      if (failures < this.maxFailures) {
        return { locked: false, retryAfterSeconds: 0, lockUntil: 0, failures };
      }

      const stepIndex = Math.min(failures - this.maxFailures, this.lockDurationStepsMs.length - 1);
      const lockMs = this.lockDurationStepsMs[Math.max(0, stepIndex)];
      const lockUntil = Date.now() + lockMs;

      if (this.store.setWithTtl) {
        await this.store.setWithTtl(this.lockKey(key), String(lockUntil), lockMs);
      }

      return {
        locked: true,
        retryAfterSeconds: Math.max(1, Math.ceil(lockMs / 1000)),
        lockUntil,
        failures
      };
    } catch (error) {
      this.warn("registerFailure", error);
      return { locked: false, retryAfterSeconds: 0, lockUntil: 0, failures: 0 };
    }
  }

  /** Limpa falhas e bloqueio (usado após login bem-sucedido). */
  async reset(key: string): Promise<void> {
    try {
      await Promise.all([
        this.store.reset(this.failureKey(key)),
        this.store.reset(this.lockKey(key))
      ]);
    } catch (error) {
      this.warn("reset", error);
    }
  }
}

function resolvePositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function resolveLockStepsMs(): number[] {
  const raw = process.env.LOGIN_LOCK_STEPS_MINUTES;
  const steps = (raw ?? DEFAULT_LOGIN_LOCK_STEPS_MINUTES.join(","))
    .split(",")
    .map((part) => resolvePositiveInt(part.trim(), 0))
    .filter((minutes) => minutes > 0)
    .map((minutes) => minutes * 60_000);

  return steps.length > 0 ? steps : DEFAULT_LOGIN_LOCK_STEPS_MINUTES.map((minutes) => minutes * 60_000);
}

const sharedRateLimitStore = createRateLimitStore();

export const loginRateLimiter = new FixedWindowRateLimiter(5, 15 * 60 * 1000, sharedRateLimitStore);
export const sensitiveRouteRateLimiter = new FixedWindowRateLimiter(30, 60 * 1000, sharedRateLimitStore);
export const loginLockGuard = new ProgressiveLoginGuard(
  resolvePositiveInt(process.env.LOGIN_MAX_FAILURES, 5),
  resolvePositiveInt(process.env.LOGIN_FAILURE_WINDOW_MINUTES, 15) * 60_000,
  resolveLockStepsMs(),
  sharedRateLimitStore
);
