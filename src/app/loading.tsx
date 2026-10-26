"use client";

import React from "react";
import { LoadingState, FeedbackPage } from "@/components/ui/FeedbackState";

export default function Loading() {
  return (
    <FeedbackPage>
      <LoadingState title="Carregando" description="Preparando a página..." />
    </FeedbackPage>
  );
}
