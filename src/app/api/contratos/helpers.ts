import { NextResponse } from "next/server";
import { ContratoError } from "@/server/services/contract-service";

/** Converte erros do módulo de contratos na resposta HTTP correspondente. */
export function contratoErrorResponse(error: unknown): NextResponse {
  if (error instanceof ContratoError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "";
  if (message === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.error("[contratos] erro inesperado:", error);
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}

/** Converte string ISO em Date, propagando erro de negócio para data inválida. */
export function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ContratoError("Data inválida.");
  }
  return date;
}
