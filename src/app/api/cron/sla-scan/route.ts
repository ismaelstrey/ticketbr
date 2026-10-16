import { NextRequest } from "next/server";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { guardAdmin } from "@/server/services/staff-context";
import { runSlaScan } from "@/server/services/notifications";

// Valida o segredo do scheduler (CRON_SECRET) enviado via header Authorization/x-cron-secret
function hasValidCronSecret(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) return false;

  const rawHeader = request.headers.get("authorization") || request.headers.get("x-cron-secret") || "";
  const token = rawHeader.toLowerCase().startsWith("bearer ") ? rawHeader.slice(7) : rawHeader;
  return token.trim() === secret;
}

/**
 * Varredura de SLA (próximo do vencimento / estourado) que dispara notificações
 * para o staff. Acesso por CRON_SECRET (scheduler) ou sessão de administrador.
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext();

  if (!hasValidCronSecret(request)) {
    // Sem segredo válido, exige sessão de administrador
    const unauthorized = await guardAdmin();
    if (unauthorized) return unauthorized;
  }

  try {
    const data = await runSlaScan();
    logRouteEvent("[cron.sla-scan] ok", "info", context, data);
    return jsonWithRequestId({ data }, context);
  } catch (error) {
    logRouteEvent("[cron.sla-scan] failed", "error", context, {
      error: error instanceof Error ? error.message : "unknown"
    });
    return jsonWithRequestId({ error: "Erro ao executar varredura de SLA" }, context, { status: 500 });
  }
}
