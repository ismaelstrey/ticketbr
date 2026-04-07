"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  telefone: string;
  isAdmin: boolean;
};

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 800;
  margin: 0;
`;

export default function CustomerAdminPage() {
  const { member } = useCustomerAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", telefone: "", isAdmin: false });
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/admin/members");
      const json = await res.json().catch(() => ({}));
      setMembers(Array.isArray(json.data) ? json.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError("");
    const res = await fetch("/api/customer/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(String(json?.error || "Falha ao criar usuário"));
      return;
    }
    setOpen(false);
    setForm({ name: "", email: "", password: "", telefone: "", isAdmin: false });
    await load();
  };

  if (!member?.isAdmin) {
    return <div style={{ padding: "1rem" }}>Acesso restrito.</div>;
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <HeaderRow>
        <Title>Administração</Title>
        <Button type="button" variant="primary" onClick={() => setOpen(true)}>Novo usuário</Button>
      </HeaderRow>

      <Card style={{ padding: "1rem" }}>
        {loading ? (
          <div style={{ padding: "1rem", opacity: 0.8 }}>Carregando...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: "1rem", opacity: 0.8 }}>Nenhum usuário cadastrado.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px 120px", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>Nome</div>
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>Email</div>
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>Telefone</div>
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>Admin</div>
            {members.map((m) => (
              <div key={m.id} style={{ display: "contents" }}>
                <div style={{ padding: "0.5rem 0" }}>{m.name}</div>
                <div style={{ padding: "0.5rem 0" }}>{m.email}</div>
                <div style={{ padding: "0.5rem 0" }}>{m.telefone}</div>
                <div style={{ padding: "0.5rem 0" }}>{m.isAdmin ? "Sim" : "Não"}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Novo usuário">
        <div style={{ display: "grid", gap: 10 }}>
          {error ? <div style={{ color: "#DC2626", fontSize: 14 }}>{error}</div> : null}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Nome</div>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Email</div>
            <Input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Telefone</div>
            <Input value={form.telefone} onChange={(e) => setForm((s) => ({ ...s, telefone: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Senha</div>
            <Input type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
            <input type="checkbox" checked={form.isAdmin} onChange={(e) => setForm((s) => ({ ...s, isAdmin: e.target.checked }))} />
            Administrador da empresa
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" variant="primary" onClick={() => create()}>Criar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
