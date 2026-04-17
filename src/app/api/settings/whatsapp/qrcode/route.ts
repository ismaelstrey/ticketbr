import { NextRequest, NextResponse } from "next/server";
import { getEvolutionConnectionState, getEvolutionQrCode } from "@/server/services/evolution-service";
import { getUazapiConnectionState, getUazapiQrCode } from "@/server/services/uazapi-service";
import { assertProviderConfigured, resolveWhatsAppProvider } from "@/server/services/chat-provider";
import { normalizeWhatsAppConfig, resolveWhatsAppConfig } from "@/server/services/whatsapp-settings";
import { writeAuditLog } from "@/server/services/audit-log";
import { enforceAdminRouteSecurity, withRateLimitHeaders } from "@/server/services/sensitive-route-guard";

export async function POST(request: NextRequest) {
  const guard = await enforceAdminRouteSecurity(request, "settings.whatsapp.qrcode");
  if (!guard.ok) {
    return guard.response;
  }

  let bodyConfig = null;
  try {
    const body = await request.json();
    bodyConfig = normalizeWhatsAppConfig(body);
    (request as any).__ticketbrBodyConfig = bodyConfig;
  } catch {
    // optional body
  }

  const config = await resolveWhatsAppConfig(request, bodyConfig);
  const provider = resolveWhatsAppProvider(config, ["uazapi", "evolution"]);

  try {
    if (provider === "uazapi") {
      if (!assertProviderConfigured("uazapi", config)) {
        return withRateLimitHeaders(NextResponse.json({ error: "UAZAPI nao configurada no servidor/sessao." }, { status: 400 }), guard.rate);
      }

      const [status, qrData] = await Promise.all([
        getUazapiConnectionState(config).catch(() => null),
        getUazapiQrCode(undefined, config)
      ]);

      await writeAuditLog({
        actorUserId: guard.actorUserId,
        action: "whatsapp_qrcode_generate",
        entity: "whatsapp_provider",
        metadata: { provider: "uazapi", status: status ?? null }
      });

      return withRateLimitHeaders(
        NextResponse.json({
          data: {
            provider,
            status,
            qrCode: qrData.qrCode,
            pairingCode: qrData.pairingCode,
            raw: qrData.raw
          }
        }),
        guard.rate
      );
    }

    if (!assertProviderConfigured("evolution", config)) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: "Evolution API nao configurada no servidor/sessao." },
          { status: 400 }
        ),
        guard.rate
      );
    }

    const [status, qrData] = await Promise.all([
      getEvolutionConnectionState(config),
      getEvolutionQrCode(config)
    ]);

    await writeAuditLog({
      actorUserId: guard.actorUserId,
      action: "whatsapp_qrcode_generate",
      entity: "whatsapp_provider",
      metadata: { provider: "evolution", status: status ?? null }
    });

    return withRateLimitHeaders(
      NextResponse.json({
        data: {
          provider: "evolution",
          status,
          qrCode: qrData.qrCode,
          pairingCode: qrData.pairingCode,
          raw: qrData.raw
        }
      }),
      guard.rate
    );
  } catch (error: any) {
    console.error("Error loading WhatsApp QR code", error);
    return withRateLimitHeaders(NextResponse.json({ error: error?.message ?? "Erro ao gerar QR Code" }, { status: 500 }), guard.rate);
  }
}
