"use client";

import React from "react";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>{children}</MainContent>
    </AppShellContainer>
  );
}

