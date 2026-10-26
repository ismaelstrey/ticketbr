import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createXlsxWorkbook } from "@/lib/xlsx";
import { createRequestContext, jsonWithRequestId, logRouteEvent } from "@/lib/observability";
import { guardStaff } from "@/server/services/staff-context";
import { getManagementReport } from "@/server/services/kpi-snapshots";
import { trackRouteResponse } from "@/server/services/route-metrics-observability";
import type { ManagementReportResponse } from "@/types/managementReport";

const ROUTE = "/api/reports/management/export";

const QuerySchema = z.object({
  format: z.enum(["xlsx", "pdf", "json"]).default("xlsx"),
  preset: z.enum(["today", "7d", "30d", "custom"]).optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

// Nome do arquivo exportado, com carimbo de data/hora
function fileName(format: string) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `relatorio_gerencial_${stamp}.${format}`;
}

// Sanitiza textos para o conjunto de caracteres suportado pelo PDF
function pdfSafe(text: string) {
  return String(text)
    .replaceAll("→", "->")
    .replaceAll("—", "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
}

// Monta o PDF do relatório gerencial (KPIs, variações e tendência)
async function buildPdf(report: ManagementReportResponse) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595.28, 841.89]);
  let y = 800;
  const left = 48;
  const line = (text: string, size = 11, isBold = false, color = rgb(0.15, 0.18, 0.22)) => {
    page.drawText(pdfSafe(text), { x: left, y, size, font: isBold ? bold : font, color });
    y -= size + 6;
  };

  line("Relatorio Gerencial de Tickets", 16, true);
  line(`Janela: ${report.data.window.from} -> ${report.data.window.to}`, 10);
  line(`Gerado em: ${report.data.generatedAt}`, 10);
  y -= 6;

  const k = report.data.kpis;
  const d = report.data.deltas;
  line("Indicadores", 13, true);
  line(`Abertos: ${k.openTotal} (variacao: ${d.openTotal.percent ?? "-"}%)`, 11);
  line(`Estourando prazo: ${k.overdue} (variacao: ${d.overdue.percent ?? "-"}%)`, 11);
  line(`TMR (h): ${k.avgResolutionHours ?? "-"}`, 11);
  line(
    `FCR: ${k.firstContactResolutionRate == null ? "-" : `${Math.round(k.firstContactResolutionRate * 100)}%`}`,
    11
  );
  y -= 10;

  line("Tendencia (snapshots diarios)", 13, true);
  if (!report.data.trend.length) {
    line("Sem snapshots no periodo.", 10);
  }
  for (const point of report.data.trend.slice(-30)) {
    const day = point.date.slice(0, 10);
    line(
      `${day} · abertos ${point.openTotal} · concluidos ${point.doneTotal} · estourando ${point.overdueTotal} · SLA alerta ${point.slaWarningTotal}`,
      9
    );
    if (y < 60) break;
  }

  if (y > 120) {
    y -= 10;
    const c = report.data.contracts;
    line("Conformidade por contrato", 13, true);
    line(
      `Ativos: ${c.summary.contratosAtivos} · vencendo em 30d: ${c.summary.contratosVencendo30d} · cancelados: ${c.summary.contratosCancelados}`,
      10
    );
    line(
      `Valor mensal (ativos): ${c.summary.valorMensalTotal.toFixed(2)} · fora de contrato: ${c.summary.ticketsForaDeContrato} · cumprimento medio: ${c.summary.cumprimentoMedioPct ?? "-"}%`,
      10
    );
    for (const item of c.items.slice(0, 12)) {
      line(
        `${item.numero} · ${item.cliente ?? "-"} · ${item.status} · cumprimento ${item.cumprimentoPct ?? "-"}% · valor ${item.valorMensal ?? "-"}`,
        9
      );
      if (y < 60) break;
    }
  }

  return Buffer.from(await doc.save());
}

export async function GET(request: NextRequest) {
  const context = createRequestContext();

  const denied = await guardStaff();
  if (denied) {
    return trackRouteResponse(ROUTE, "GET", context, denied);
  }

  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = QuerySchema.safeParse(raw);
  if (!parsed.success) {
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId({ error: "Parâmetros inválidos" }, context, { status: 400 })
    );
  }

  const { format, ...filters } = parsed.data;

  try {
    const report = await getManagementReport(filters);

    if (format === "json") {
      return trackRouteResponse(
        ROUTE,
        "GET",
        context,
        jsonWithRequestId({ data: report.data }, context, { headers: { "Cache-Control": "no-store" } })
      );
    }

    if (format === "xlsx") {
      const summaryRows = [
        {
          windowFrom: report.data.window.from,
          windowTo: report.data.window.to,
          generatedAt: report.data.generatedAt,
          openTotal: report.data.kpis.openTotal,
          overdue: report.data.kpis.overdue,
          avgResolutionHours: report.data.kpis.avgResolutionHours,
          firstContactResolutionRate: report.data.kpis.firstContactResolutionRate
        }
      ];
      const trendRows = report.data.trend.map((point) => ({
        date: point.date.slice(0, 10),
        openTotal: point.openTotal,
        doneTotal: point.doneTotal,
        overdueTotal: point.overdueTotal,
        slaWarningTotal: point.slaWarningTotal,
        avgResolutionHours: point.avgResolutionHours,
        firstContactResolutionRate: point.firstContactResolutionRate
      }));

      const contractRows = report.data.contracts.items.map((item) => ({
        numero: item.numero,
        titulo: item.titulo,
        cliente: item.cliente,
        status: item.status,
        slaSolucaoHoras: item.slaSolucaoHoras,
        valorMensal: item.valorMensal,
        ticketsTotal: item.ticketsTotal,
        ticketsResolvidos: item.ticketsResolvidos,
        ticketsDentroSla: item.ticketsDentroSla,
        cumprimentoPct: item.cumprimentoPct,
        vigenciaInicio: item.vigencia.inicio.slice(0, 10),
        vigenciaFim: item.vigencia.fim ? item.vigencia.fim.slice(0, 10) : null
      }));

      const bytes = await createXlsxWorkbook([
        { name: "Resumo", rows: summaryRows },
        { name: "Tendencia", rows: trendRows },
        { name: "Contratos", rows: contractRows }
      ]);

      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName("xlsx")}"`
        }
      });
    }

    const pdf = await buildPdf(report);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName("pdf")}"`
      }
    });
  } catch (error) {
    logRouteEvent("[reports/management/export] failed", "error", context, {
      error: error instanceof Error ? error.message : "unknown"
    });
    return trackRouteResponse(
      ROUTE,
      "GET",
      context,
      jsonWithRequestId({ error: "Erro ao exportar relatório gerencial" }, context, { status: 500 })
    );
  }
}
