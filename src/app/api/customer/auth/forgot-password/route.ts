import { NextResponse } from "next/server";
import { sensitiveRouteRateLimiter } from "@/lib/rateLimit";
import { requestCustomerPasswordReset } from "@/server/services/password-reset";

// Resposta padrão: não revela se o e-mail informado existe na base
const GENERIC_MESSAGE = "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.";

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";

    const rate = await sensitiveRouteRateLimiter.consume(`forgot-password:${clientIp}`);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas solicitações. Tente novamente em instantes." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfterSeconds),
            "X-RateLimit-Limit": String(rate.limit),
            "X-RateLimit-Remaining": String(rate.remaining),
            "X-RateLimit-Reset": String(Math.floor(rate.resetAt / 1000))
          }
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = String((body as { email?: unknown }).email || "").trim();

    if (!email) {
      return NextResponse.json({ error: "Informe o e-mail cadastrado." }, { status: 400 });
    }

    await requestCustomerPasswordReset(email);

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Customer forgot password error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
