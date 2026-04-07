import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { login } from "@/lib/auth";
import { loginRateLimiter, RateLimitResult } from "@/lib/rateLimit";
import { writeAuditLog } from "@/server/services/audit-log";

function buildRateLimitHeaders(rate: RateLimitResult, includeRetryAfter = false) {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(Math.floor(rate.resetAt / 1000))
  };

  if (includeRetryAfter) {
    headers["Retry-After"] = String(rate.retryAfterSeconds);
  }

  return headers;
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";

    const rate = loginRateLimiter.consume(clientIp);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de login. Tente novamente mais tarde." },
        { status: 429, headers: buildRateLimitHeaders(rate, true) }
      );
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const rawPassword = String(password || "");

    if (!normalizedEmail || !rawPassword) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400, headers: buildRateLimitHeaders(rate) }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user || String(user.role) !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401, headers: buildRateLimitHeaders(rate) }
      );
    }

    const isPasswordValid = await compare(rawPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401, headers: buildRateLimitHeaders(rate) }
      );
    }

    const member = await prisma.funcionario.findUnique({
      where: { userId: user.id },
      select: { id: true, solicitante_id: true, isAdmin: true }
    });

    if (!member?.solicitante_id) {
      return NextResponse.json(
        { error: "Usuário não está vinculado a uma empresa" },
        { status: 403, headers: buildRateLimitHeaders(rate) }
      );
    }

    await login({
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    await writeAuditLog({
      solicitanteId: member.solicitante_id,
      actorUserId: user.id,
      action: "customer.login",
      entity: "user",
      entityId: user.id,
      metadata: { ip: clientIp }
    });

    loginRateLimiter.reset(clientIp);

    return NextResponse.json(
      {
        message: "Login realizado com sucesso",
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        member: { id: member.id, solicitanteId: member.solicitante_id, isAdmin: member.isAdmin }
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.limit),
          "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000))
        }
      }
    );
  } catch (error) {
    console.error("Customer login error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

