"use client";

import React, { useState } from "react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { UserForm } from "@/components/forms/UserForm";
import { useCrud } from "@/hooks/useCrud";

export default function UserPage() {
  const { data, loading, create, update, remove } = useCrud<any>("/api/users");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const handleAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: any) => {
    let success = false;
    if (editingItem) {
      success = await update(editingItem.id, formData);
    } else {
      success = await create(formData);
    }
    
    if (success) {
      setIsModalOpen(false);
    }
  };

  const columns: Column<any>[] = [
    { header: "Nome", accessor: "name" },
    { header: "Email", accessor: "email" },
    { header: "Role", accessor: "role" },
    { header: "Criado em", accessor: (item) => new Date(item.createdAt).toLocaleDateString() }
  ];

  return (
    <div style={{ padding: "1rem", height: "100%" }}>
      <DataTable
        title="Usuários do Sistema"
        data={data}
        columns={columns}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={(item) => remove(item.id)}
        searchPlaceholder="Buscar por nome ou email..."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Editar Usuário" : "Novo Usuário"}
      >
        <UserForm
          initialData={editingItem}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          loading={loading}
        />
      </Modal>
    </div>
  );
}
