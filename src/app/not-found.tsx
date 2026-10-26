"use client";

import React from "react";
import styled from "styled-components";
import { useRouter } from "next/navigation";
import { EmptyState, FeedbackPage } from "@/components/ui/FeedbackState";
import { Button } from "@/components/ui/Button";

const Actions = styled.div`
  display: flex;
  justify-content: center;
`;

export default function NotFound() {
  const router = useRouter();

  return (
    <FeedbackPage>
      <EmptyState title="Página não encontrada" description="O endereço acessado não existe ou foi movido." />
      <Actions>
        <Button variant="primary" onClick={() => router.push("/")}>
          Voltar ao início
        </Button>
      </Actions>
    </FeedbackPage>
  );
}
