"use client";

import React from "react";
import styled from "styled-components";
import { FiPlus, FiEdit2, FiTrash2, FiSearch } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const Container = styled.div`
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Header = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
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
    color: #9ca3af;
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
  background: #f9fafb;
  color: #4b5563;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  color: #374151;
  font-size: 0.9rem;
`;

const ActionButton = styled.button<{ variant?: "edit" | "delete" }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 4px;
  color: ${({ variant }) => (variant === "delete" ? "#ef4444" : "#3b82f6")};
  transition: background 0.2s;

  &:hover {
    background: ${({ variant }) => (variant === "delete" ? "#fee2e2" : "#eff6ff")};
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.95rem;
`;

const LoadingOverlay = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: #6b7280;
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
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
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
                      </div>
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
