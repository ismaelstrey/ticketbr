import { NextResponse } from "next/server";
import { sensitiveRouteRateLimiter } from "@/lib/rateLimit";
import { resetCustomerPassword } from "@/server/services/password-reset";
import { writeAuditLog } from "@/server/services/audit-log";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";

    const rate = await sensitiveRouteRateLimiter.consume(`reset-password:${clientIp}`);
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
    const token = String((body as { token?: unknown }).token || "").trim();
    const password = String((body as { password?: unknown }).password || "");

    if (!token) {
      return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 400 });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` },
        { status: 400 }
      );
    }

    const result = await resetCustomerPassword(token, password);
    if (!result.ok) {
      return NextResponse.json({ error: "Token inválido ou expirado." }, { status: 400 });
    }

    await writeAuditLog({
      actorUserId: result.userId,
      action: "customer.password_reset",
      entity: "user",
      entityId: result.userId,
      metadata: { ip: clientIp }
    });

    return NextResponse.json({ message: "Senha redefinida com sucesso." });
  } catch (error) {
    console.error("Customer reset password error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
