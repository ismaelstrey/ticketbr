"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TicketOperationalDashboard } from "@/components/dashboard/TicketOperationalDashboard";

export default function Home() {
  return (
    <AppLayout>
      <TicketOperationalDashboard />
    </AppLayout>
  );
}
