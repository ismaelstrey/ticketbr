import { NextResponse } from "next/server";
import { evolutionIsConfigured, getEvolutionConnectionState, getEvolutionQrCode } from "@/server/services/evolution-service";

export async function GET() {
  if (!evolutionIsConfigured()) {
    return NextResponse.json(
      { error: "Evolution API não configurada no servidor." },
      { status: 400 }
    );
  }

  try {
    const [status, qrData] = await Promise.all([
      getEvolutionConnectionState(),
      getEvolutionQrCode()
    ]);

    return NextResponse.json({
      data: {
        status,
        qrCode: qrData.qrCode,
        pairingCode: qrData.pairingCode,
        raw: qrData.raw
      }
    });
  } catch (error: any) {
    console.error("Error loading WhatsApp QR code", error);
    return NextResponse.json({ error: error?.message ?? "Erro ao gerar QR Code" }, { status: 500 });
  }
}
