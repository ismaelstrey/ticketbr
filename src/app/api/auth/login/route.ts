import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { login } from "@/lib/auth";
import { loginRateLimiter, loginLockGuard, RateLimitResult } from "@/lib/rateLimit";

function buildRateLimitHeaders(rate: RateLimitResult, includeRetryAfter = false, retryAfterSeconds?: number) {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(Math.floor(rate.resetAt / 1000)),
  };

  if (includeRetryAfter) {
    headers["Retry-After"] = String(retryAfterSeconds ?? rate.retryAfterSeconds);
  }

  return headers;
}

// Registra a falha de credencial e responde 429 (bloqueio progressivo) ou 401
async function respondInvalidCredentials(rate: RateLimitResult, lockKey: string) {
  const failure = await loginLockGuard.registerFailure(lockKey);

  if (failure.locked) {
    return NextResponse.json(
      { error: "Muitas tentativas de login. Tente novamente mais tarde." },
      { status: 429, headers: buildRateLimitHeaders(rate, true, failure.retryAfterSeconds) }
    );
  }

  return NextResponse.json(
    { error: "Credenciais inválidas" },
    { status: 401, headers: buildRateLimitHeaders(rate) }
  );
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";

    const rate = await loginRateLimiter.consume(clientIp);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de login. Tente novamente mais tarde." },
        {
          status: 429,
          headers: buildRateLimitHeaders(rate, true),
        }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400, headers: buildRateLimitHeaders(rate) }
      );
    }

    const lockKey = String(email).trim().toLowerCase();

    const lock = await loginLockGuard.status(lockKey);
    if (lock.locked) {
      return NextResponse.json(
        { error: "Muitas tentativas de login. Tente novamente mais tarde." },
        { status: 429, headers: buildRateLimitHeaders(rate, true, lock.retryAfterSeconds) }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return respondInvalidCredentials(rate, lockKey);
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return respondInvalidCredentials(rate, lockKey);
    }

    await login({
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    await loginRateLimiter.reset(clientIp);
    await loginLockGuard.reset(lockKey);

    return NextResponse.json(
      {
        message: "Login realizado com sucesso",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.limit),
          "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000)),
        }
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
