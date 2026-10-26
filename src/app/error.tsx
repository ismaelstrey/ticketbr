"use client";

import React, { useEffect } from "react";
import { ErrorState, FeedbackPage } from "@/components/ui/FeedbackState";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app] erro de renderização", error);
  }, [error]);

  return (
    <FeedbackPage>
      <ErrorState
        title="Algo deu errado"
        description="Não foi possível carregar esta página. Tente novamente."
        onAction={reset}
      />
    </FeedbackPage>
  );
}
