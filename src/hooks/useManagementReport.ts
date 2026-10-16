"use client";

import { useCallback, useEffect, useState } from "react";
import type { ManagementReportResponse } from "@/types/managementReport";

export type ManagementReportData = ManagementReportResponse["data"];

type UseManagementReportOptions = {
  preset?: "today" | "7d" | "30d" | "custom";
  from?: string;
  to?: string;
};

/**
 * Hook de acesso à API do relatório gerencial: carrega KPIs do período,
 * comparação com o período anterior e a série de tendência persistida.
 */
export function useManagementReport(options: UseManagementReportOptions = {}) {
  const { preset = "7d", from, to } = options;
  const [data, setData] = useState<ManagementReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca o relatório gerencial no backend conforme o período selecionado
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ preset });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/reports/management?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar relatório");

      setData((json?.data ?? null) as ManagementReportData | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar relatório");
    } finally {
      setLoading(false);
    }
  }, [preset, from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
