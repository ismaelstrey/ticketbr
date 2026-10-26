"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { PageContainer, PageHeader, PageSubtitle, PageTitle } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/context/ToastContext";
import { FiArrowLeft } from "@/components/icons";
import { ContratoForm, type ContratoFormPayload } from "@/components/contracts/ContratoForm";

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

export default function NovoContratoPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (payload: ContratoFormPayload) => {
    setSaving(true);
    try {
      const res = await fetch("/api/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao criar contrato");

      showToast("Contrato criado como rascunho.", "success");
      router.push(`/contratos/${json.data.id}`);
    } catch (err: any) {
      showToast(err?.message || "Falha ao criar contrato", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <HeaderRow>
          <div>
            <PageTitle>Novo contrato</PageTitle>
            <PageSubtitle>
              O contrato é criado como rascunho. Ative-o para liberar o serviço da empresa.
            </PageSubtitle>
          </div>
          <Button variant="ghost" onClick={() => router.push("/contratos")}>
            <FiArrowLeft aria-hidden="true" /> Voltar
          </Button>
        </HeaderRow>
      </PageHeader>

      <Card as="section">
        <ContratoForm
          onCancel={() => router.push("/contratos")}
          onSubmit={handleSubmit}
          loading={saving}
        />
      </Card>
    </PageContainer>
  );
}
