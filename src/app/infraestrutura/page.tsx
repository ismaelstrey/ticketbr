"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { InfraTreeView } from "@/components/inventory/InfraTree";
import { InfraSearchPalette } from "@/components/inventory/InfraSearchPalette";
import { EquipmentFormModal } from "@/components/inventory/EquipmentFormModal";
import { useInventory, useInventoryTree, useSolicitantes } from "@/hooks/useInventory";

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
`;

const Sub = styled.div`
  margin-top: 6px;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: 0.9rem;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
`;

const Toolbar = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
`;

const ClientSelect = styled(Select)`
  min-width: 240px;
`;

const Shortcut = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

const ErrorBox = styled.div`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border: 1px solid ${({ theme }) => theme.tokens.color.status.warningBorder};
  background: ${({ theme }) => theme.tokens.color.status.warningSurface};
  color: ${({ theme }) => theme.tokens.color.status.warningText};
`;

const LoadingBox = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

/**
 * Página de infraestrutura e virtualização: árvore host -> VM -> container por cliente
 * e busca rápida global (Ctrl/Cmd + K).
 */
export default function InfraestruturaPage() {
  const router = useRouter();
  const { solicitantes } = useSolicitantes();
  const [solicitanteId, setSolicitanteId] = useState("");
  const { tree, loading, error, reload } = useInventoryTree(solicitanteId || null);
  const { create } = useInventory({ pageSize: 1 });

  const [searchOpen, setSearchOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // Atalho global Ctrl/Cmd + K para abrir a busca rápida
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Cria um novo ativo e atualiza a árvore
  const handleSubmit = async (payload: Record<string, unknown>) => {
    const ok = await create(payload);
    if (ok) await reload();
    return ok;
  };

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <Page>
          <HeaderRow>
            <div>
              <Title>Infraestrutura e virtualização</Title>
              <Sub>
                Servidores físicos, hosts Proxmox/VMware, máquinas virtuais e containers por cliente.
              </Sub>
            </div>
            <HeaderActions>
              <Button type="button" variant="ghost" onClick={() => setSearchOpen(true)}>
                Busca rápida
              </Button>
              <Button type="button" variant="primary" onClick={() => setFormOpen(true)}>
                Novo ativo
              </Button>
            </HeaderActions>
          </HeaderRow>

          <Toolbar>
            <ClientSelect
              value={solicitanteId}
              onChange={(event) => setSolicitanteId(event.target.value)}
              aria-label="Selecionar cliente"
            >
              <option value="">Todos os clientes</option>
              {solicitantes.map((solicitante) => (
                <option key={solicitante.id} value={solicitante.id}>
                  {solicitante.nome_fantasia}
                </option>
              ))}
            </ClientSelect>
            <Shortcut>
              Dica: use <strong>Ctrl/Cmd + K</strong> para responder &ldquo;onde está este recurso?&rdquo;
            </Shortcut>
          </Toolbar>

          {error ? <ErrorBox role="alert">{error}</ErrorBox> : null}

          {loading && !tree ? (
            <LoadingBox>Carregando infraestrutura...</LoadingBox>
          ) : tree ? (
            <InfraTreeView tree={tree} onSelect={(id) => router.push(`/inventory/${id}`)} />
          ) : null}
        </Page>

        <InfraSearchPalette
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelect={(id) => router.push(`/inventory/${id}`)}
          solicitanteId={solicitanteId || undefined}
        />

        <EquipmentFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} />
      </MainContent>
    </AppShellContainer>
  );
}
