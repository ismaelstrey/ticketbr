"use client";

import React from "react";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { TicketOperationalDashboard } from "@/components/dashboard/TicketOperationalDashboard";

export default function Home() {
  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <TicketOperationalDashboard />
      </MainContent>
    </AppShellContainer>
  );
}
