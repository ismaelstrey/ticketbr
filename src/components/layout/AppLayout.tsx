"use client";

import React from "react";
import { AppShellContainer, MainContent, SkipToContentLink } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShellContainer>
      <SkipToContentLink href="#main-content">Pular para conteúdo</SkipToContentLink>
      <Sidebar />
      <MainContent id="main-content" tabIndex={-1}>
        {children}
      </MainContent>
    </AppShellContainer>
  );
}
