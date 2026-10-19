"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styled from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useEquipmentDetail } from "@/hooks/useInventory";
import { Credential } from "@/types/inventory";
import { CredentialList } from "@/components/inventory/CredentialList";
import { CredentialModal } from "@/components/inventory/CredentialModal";
import { GrantModal } from "@/components/inventory/GrantModal";
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_TONE, EQUIPMENT_TYPE_LABELS } from "@/components/inventory/labels";

const Page = styled.div`
  padding: 1rem;
  display: grid;
  gap: 12px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 900;
  color: ${({ theme }) => theme.tokens.color.text.primary};
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const Sub = styled.div`
  margin-top: 6px;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: 0.9rem;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem 1.25rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr 1fr;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const InfoLabel = styled.span`
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

const InfoValue = styled.span`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.tokens.color.text.primary};
  word-break: break-word;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 0.85rem;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

/**
 * Página de detalhe do equipamento com o painel do cofre de credenciais.
 */
export default function InventoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";

  const { equipment, loading, error, createCredential, updateCredential, removeCredential, revealCredential } =
    useEquipmentDetail(id);

  const [credentialFormOpen, setCredentialFormOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [grantCredential, setGrantCredential] = useState<Credential | null>(null);

  const openNewCredential = () => {
    setEditingCredential(null);
    setCredentialFormOpen(true);
  };

  const openEditCredential = (credential: Credential) => {
    setEditingCredential(credential);
    setCredentialFormOpen(true);
  };

  // Cria ou atualiza a credencial conforme o modo do modal
  const handleCredentialSubmit = async (payload: Record<string, unknown>) => {
    if (editingCredential) return updateCredential(editingCredential.id, payload);
    return createCredential(payload);
  };

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <Page>
          <HeaderRow>
            <div>
              <Title>
                {equipment?.name ?? "Equipamento"}
                {equipment ? (
                  <Badge tone={EQUIPMENT_STATUS_TONE[equipment.status]}>
                    {EQUIPMENT_STATUS_LABELS[equipment.status]}
                  </Badge>
                ) : null}
              </Title>
              <Sub>{equipment ? EQUIPMENT_TYPE_LABELS[equipment.type] : ""}</Sub>
            </div>
            <Button type="button" variant="ghost" onClick={() => router.push("/inventory")}>
              Voltar
            </Button>
          </HeaderRow>

          {loading ? <Card style={{ padding: "1rem" }}>Carregando...</Card> : null}
          {error ? (
            <Card style={{ padding: "1rem" }} role="alert">
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Erro</div>
              <div style={{ opacity: 0.8 }}>{error}</div>
            </Card>
          ) : null}

          {equipment ? (
            <>
              <Card style={{ padding: "1.25rem" }}>
                <InfoGrid>
                  <InfoItem>
                    <InfoLabel>Código</InfoLabel>
                    <InfoValue>{equipment.code || "—"}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Endereço IP</InfoLabel>
                    <InfoValue>{equipment.ipAddress || "—"}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Hostname</InfoLabel>
                    <InfoValue>{equipment.hostname || "—"}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Fabricante</InfoLabel>
                    <InfoValue>{equipment.brand || "—"}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Modelo</InfoLabel>
                    <InfoValue>{equipment.model || "—"}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Número de série</InfoLabel>
                    <InfoValue>{equipment.serialNumber || "—"}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Endereço MAC</InfoLabel>
                    <InfoValue>{equipment.macAddress || "—"}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Localização</InfoLabel>
                    <InfoValue>{equipment.location || "—"}</InfoValue>
                  </InfoItem>
                  <InfoItem>
                    <InfoLabel>Função</InfoLabel>
                    <InfoValue>{equipment.func || "—"}</InfoValue>
                  </InfoItem>
                  {equipment.solicitante ? (
                    <InfoItem>
                      <InfoLabel>Cliente</InfoLabel>
                      <InfoValue>{equipment.solicitante.nome_fantasia}</InfoValue>
                    </InfoItem>
                  ) : null}
                  <InfoItem style={{ gridColumn: "1 / -1" }}>
                    <InfoLabel>Descrição</InfoLabel>
                    <InfoValue>{equipment.description || "—"}</InfoValue>
                  </InfoItem>
                </InfoGrid>
              </Card>

              <Card style={{ padding: "1.25rem" }}>
                <SectionHeader>
                  <SectionTitle>Cofre de credenciais</SectionTitle>
                  <Button type="button" variant="primary" onClick={openNewCredential}>
                    Nova credencial
                  </Button>
                </SectionHeader>
                <CredentialList
                  credentials={equipment.credentials}
                  onEdit={openEditCredential}
                  onDelete={(credential) => removeCredential(credential.id)}
                  onReveal={revealCredential}
                  onManageAccess={setGrantCredential}
                />
              </Card>
            </>
          ) : null}
        </Page>

        <CredentialModal
          isOpen={credentialFormOpen}
          onClose={() => setCredentialFormOpen(false)}
          onSubmit={handleCredentialSubmit}
          credential={editingCredential}
        />
        <GrantModal isOpen={Boolean(grantCredential)} onClose={() => setGrantCredential(null)} credential={grantCredential} />
      </MainContent>
    </AppShellContainer>
  );
}
