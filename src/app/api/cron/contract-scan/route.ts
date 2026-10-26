import { NextRequest } from "next/server";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { guardAdmin } from "@/server/services/staff-context";
import { expirarContratosVencidos } from "@/server/services/contract-service";
import { notifyContractExpired, runContractExpiryScan } from "@/server/services/notifications";

// Valida o segredo do scheduler (CRON_SECRET) enviado via header Authorization/x-cron-secret
function hasValidCronSecret(request: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) return false;

  const rawHeader = request.headers.get("authorization") || request.headers.get("x-cron-secret") || "";
  const token = rawHeader.toLowerCase().startsWith("bearer ") ? rawHeader.slice(7) : rawHeader;
  return token.trim() === secret;
}

/**
 * Varredura de contratos: expira os vencidos, renova automaticamente quando
 * configurado, notifica vencimentos/expirações e avisa os contratos que estão
 * próximos do fim da vigência. Ressincroniza o bloqueio de serviço das empresas.
 * Acesso por CRON_SECRET (scheduler) ou sessão de administrador.
 */
export async function GET(request: NextRequest) {
  const context = createRequestContext();

  if (!hasValidCronSecret(request)) {
    // Sem segredo válido, exige sessão de administrador
    const unauthorized = await guardAdmin();
    if (unauthorized) return unauthorized;
  }

  try {
    const expiracao = await expirarContratosVencidos();

    for (const contrato of expiracao.expirados) {
      await notifyContractExpired({ contrato });
    }

    const scan = await runContractExpiryScan();

    const data = { ...expiracao, contratosVencendo: scan.scanned, avisos: scan.avisos };
    logRouteEvent("[cron.contract-scan] ok", "info", context, data);
    return jsonWithRequestId({ data }, context);
  } catch (error) {
    logRouteEvent("[cron.contract-scan] failed", "error", context, {
      error: error instanceof Error ? error.message : "unknown"
    });
    return jsonWithRequestId({ error: "Erro ao executar varredura de contratos" }, context, { status: 500 });
  }
}
