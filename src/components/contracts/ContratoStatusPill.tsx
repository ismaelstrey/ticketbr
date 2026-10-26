"use client";

import { Badge } from "@/components/ui/Badge";
import { contratoStatusLabels, type ContratoStatus } from "./contract-constants";

const toneByStatus: Record<ContratoStatus, "neutral" | "success" | "warning" | "info"> = {
  DRAFT: "info",
  ACTIVE: "success",
  SUSPENDED: "warning",
  EXPIRED: "warning",
  CANCELLED: "neutral"
};

/** Selo visual do status do contrato, reusando o Badge do design system. */
export function ContratoStatusPill({ status }: { status: ContratoStatus }) {
  return <Badge tone={toneByStatus[status]}>{contratoStatusLabels[status]}</Badge>;
}
