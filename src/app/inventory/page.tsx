"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useInventory } from "@/hooks/useInventory";
import { Equipment } from "@/types/inventory";
import { EquipmentTable } from "@/components/inventory/EquipmentTable";
import { EquipmentFormModal } from "@/components/inventory/EquipmentFormModal";
import { GroupsModal } from "@/components/inventory/GroupsModal";
import { EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_OPTIONS, EQUIPMENT_TYPE_LABELS, EQUIPMENT_TYPE_OPTIONS } from "@/components/inventory/labels";

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

const SearchForm = styled.form`
  display: flex;
  gap: 0.6rem;
  flex: 1;
  min-width: 240px;
`;

const SearchInput = styled(Input)`
  flex: 1;
`;

const FilterSelect = styled(Select)`
  min-width: 170px;
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: 0.85rem;
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const ErrorBox = styled.div`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border: 1px solid ${({ theme }) => theme.tokens.color.status.warningBorder};
  background: ${({ theme }) => theme.tokens.color.status.warningSurface};
  color: ${({ theme }) => theme.tokens.color.status.warningText};
`;

/**
 * Página de listagem dos equipamentos do inventário, com filtros, paginação e
 * acesso ao cofre de credenciais de cada equipamento.
 */
export default function InventoryPage() {
  const router = useRouter();
  const { filters, setFilters, items, total, loading, error, create, update, remove } = useInventory();

  const [searchInput, setSearchInput] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const openNew = () => {
    setEditingEquipment(null);
    setFormOpen(true);
  };

  const openEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setFormOpen(true);
  };

  // Aplica o texto de busca e volta para a primeira página
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  // Cria ou atualiza o equipamento conforme o modo do modal
  const handleSubmit = async (payload: Record<string, unknown>) => {
    if (editingEquipment) return update(editingEquipment.id, payload);
    return create(payload);
  };

  const goToPage = (page: number) => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    setFilters((prev) => ({ ...prev, page: safePage }));
  };

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <Page>
          <HeaderRow>
            <div>
              <Title>Inventário de equipamentos</Title>
              <Sub>Ativos de TI, dados de acesso e cofre de senhas cifradas.</Sub>
            </div>
            <HeaderActions>
              <Button type="button" variant="ghost" onClick={() => setGroupsOpen(true)}>
                Grupos de acesso
              </Button>
              <Button type="button" variant="primary" onClick={openNew}>
                Novo equipamento
              </Button>
            </HeaderActions>
          </HeaderRow>

          <Toolbar>
            <SearchForm onSubmit={handleSearch}>
              <SearchInput
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nome, IP, hostname ou série..."
                aria-label="Buscar equipamentos"
              />
              <Button type="submit" variant="ghost">
                Buscar
              </Button>
            </SearchForm>
            <FilterSelect
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value, page: 1 }))}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos os tipos</option>
              {EQUIPMENT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {EQUIPMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
              aria-label="Filtrar por status"
            >
              <option value="">Todos os status</option>
              {EQUIPMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {EQUIPMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </FilterSelect>
          </Toolbar>

          {error ? <ErrorBox role="alert">{error}</ErrorBox> : null}

          <EquipmentTable
            equipment={items}
            loading={loading}
            onOpen={(id) => router.push(`/inventory/${id}`)}
            onEdit={openEdit}
            onDelete={(equipment) => remove(equipment.id)}
          />

          <Footer>
            <span>
              {total} equipamento(s) · página {filters.page} de {totalPages}
            </span>
            <Pagination>
              <Button type="button" variant="ghost" onClick={() => goToPage(filters.page - 1)} disabled={filters.page <= 1}>
                Anterior
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => goToPage(filters.page + 1)}
                disabled={filters.page >= totalPages}
              >
                Próxima
              </Button>
            </Pagination>
          </Footer>
        </Page>

        <EquipmentFormModal
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmit}
          equipment={editingEquipment}
        />
        <GroupsModal isOpen={groupsOpen} onClose={() => setGroupsOpen(false)} />
      </MainContent>
    </AppShellContainer>
  );
}
