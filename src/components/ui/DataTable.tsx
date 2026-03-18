"use client";

import React from "react";
import styled from "styled-components";
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const Container = styled.div`
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border-radius: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.card};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Header = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.8rem;
  align-items: center;
`;

const SearchWrapper = styled.div`
  position: relative;
  width: 250px;

  svg {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.text.muted};
  }

  input {
    padding-left: 2.2rem;
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  flex: 1;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`;

const Th = styled.th`
  padding: 0.75rem 1.5rem;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9rem;
`;

const ActionButton = styled.button<{ variant?: "edit" | "delete" }>`
  background: none;
  border: 1px solid ${({ theme, variant }) => (variant === "delete" ? `${theme.colors.status.warning}33` : theme.colors.border)};
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 10px;
  color: ${({ theme, variant }) => (variant === "delete" ? theme.colors.status.warning : theme.colors.primary)};
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: ${({ theme, variant }) => (variant === "delete" ? `${theme.colors.status.warning}14` : `${theme.colors.primary}12`)};
    border-color: ${({ theme, variant }) => (variant === "delete" ? `${theme.colors.status.warning}55` : `${theme.colors.primary}44`)};
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.95rem;
`;

const LoadingOverlay = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ActionCell = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
`;

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  width?: string;
}

interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  loading?: boolean;
  searchPlaceholder?: string;
}

export function DataTable<T extends { id: string | number }>({
  title,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  loading = false,
  searchPlaceholder = "Pesquisar..."
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    const lowerTerm = searchTerm.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(lowerTerm)
      )
    );
  }, [data, searchTerm]);

  return (
    <Container>
      <Header>
        <Title>{title}</Title>
        <Actions>
          <SearchWrapper>
            <FiSearch />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchWrapper>
          {onAdd && (
            <Button onClick={onAdd}>
              <FiPlus /> Novo
            </Button>
          )}
        </Actions>
      </Header>

      <TableWrapper>
        {loading ? (
          <LoadingOverlay>Carregando...</LoadingOverlay>
        ) : filteredData.length > 0 ? (
          <Table>
            <thead>
              <tr>
                {columns.map((col, index) => (
                  <Th key={index} style={{ width: col.width }}>{col.header}</Th>
                ))}
                {(onEdit || onDelete) && <Th style={{ width: "100px", textAlign: "right" }}>Ações</Th>}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id}>
                  {columns.map((col, index) => (
                    <Td key={index}>
                      {typeof col.accessor === "function"
                        ? col.accessor(item)
                        : (item[col.accessor] as React.ReactNode)}
                    </Td>
                  ))}
                  {(onEdit || onDelete) && (
                    <Td style={{ textAlign: "right" }}>
                      <ActionCell>
                        {onEdit && (
                          <ActionButton variant="edit" onClick={() => onEdit(item)} title="Editar">
                            <FiEdit2 />
                          </ActionButton>
                        )}
                        {onDelete && (
                          <ActionButton variant="delete" onClick={() => onDelete(item)} title="Excluir">
                            <FiTrash2 />
                          </ActionButton>
                        )}
                      </ActionCell>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState>Nenhum registro encontrado.</EmptyState>
        )}
      </TableWrapper>
    </Container>
  );
}
