import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";

/**
 * Shell comum das telas de contratos (sidebar + conteúdo).
 * Reusa o `AppLayout` para manter a mesma estrutura das demais áreas do sistema.
 */
export default function ContratosLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
