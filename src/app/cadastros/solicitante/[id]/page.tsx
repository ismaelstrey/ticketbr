"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styled from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/context/ToastContext";

type Solicitante = {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco_completo: string;
  data_cadastro: string;
  status: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type Funcionario = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
};

const Wrapper = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Card = styled.section`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 0.9rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Item = styled.div`
  border: 1px solid #eef2f7;
  border-radius: 10px;
  padding: 0.7rem;
`;

const Label = styled.div`
  font-size: 0.8rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
`;

const Value = styled.div`
  color: #111827;
  font-weight: 600;
  word-break: break-word;
`;

const FuncionarioTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.75rem;

  th,
  td {
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    padding: 0.55rem;
    font-size: 0.86rem;
  }
`;

export default function SolicitanteDetalhesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [data, setData] = useState<Solicitante | null>(null);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    password: "",
  });

  const loadFuncionarios = async (id: string) => {
    const res = await fetch(`/api/solicitantes/${id}/funcionarios`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Erro ao carregar funcionários");
    setFuncionarios(Array.isArray(json?.data) ? json.data : []);
  };

  useEffect(() => {
    const fetchOne = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/solicitantes/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Erro ao carregar solicitante");
        setData(json.data || null);

        if (params?.id) {
          await loadFuncionarios(params.id);
        }
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar solicitante");
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) fetchOne();
  }, [params?.id]);

  const handleCreateFuncionario = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/solicitantes/${params.id}/funcionarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao cadastrar funcionário");

      showToast("Funcionário vinculado ao solicitante com sucesso.", "success");
      setIsModalOpen(false);
      setForm({ nome: "", email: "", telefone: "", password: "" });
      await loadFuncionarios(params.id);
    } catch (err: any) {
      showToast(err?.message || "Erro ao cadastrar funcionário", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <Wrapper>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Detalhes do Solicitante</h2>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <Button variant="primary" onClick={() => setIsModalOpen(true)}>Adicionar Funcionário</Button>
                <Button variant="ghost" onClick={() => router.push("/cadastros/solicitante")}>Voltar</Button>
              </div>
            </div>

            {loading && <p>Carregando...</p>}
            {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

            {!loading && !error && data && (
              <Grid>
                <Item><Label>ID</Label><Value>{data.id}</Value></Item>
                <Item><Label>Status</Label><Value>{data.status ? "Ativo" : "Inativo"}</Value></Item>
                <Item><Label>Razão Social</Label><Value>{data.razao_social}</Value></Item>
                <Item><Label>Nome Fantasia</Label><Value>{data.nome_fantasia}</Value></Item>
                <Item><Label>CNPJ</Label><Value>{data.cnpj}</Value></Item>
                <Item><Label>E-mail</Label><Value>{data.email}</Value></Item>
                <Item><Label>Telefone</Label><Value>{data.telefone}</Value></Item>
                <Item><Label>Endereço Completo</Label><Value>{data.endereco_completo}</Value></Item>
                <Item><Label>Data de Cadastro</Label><Value>{new Date(data.data_cadastro).toLocaleString("pt-BR")}</Value></Item>
                <Item><Label>Criado em</Label><Value>{new Date(data.created_at).toLocaleString("pt-BR")}</Value></Item>
                <Item><Label>Atualizado em</Label><Value>{new Date(data.updated_at).toLocaleString("pt-BR")}</Value></Item>
                <Item><Label>Removido em</Label><Value>{data.deleted_at ? new Date(data.deleted_at).toLocaleString("pt-BR") : "-"}</Value></Item>
              </Grid>
            )}
          </Card>

          <Card>
            <h3 style={{ marginTop: 0 }}>Funcionários vinculados</h3>
            <FuncionarioTable>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Usuário</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: "#6b7280" }}>Nenhum funcionário vinculado.</td>
                  </tr>
                ) : (
                  funcionarios.map((f) => (
                    <tr key={f.id}>
                      <td>{f.nome}</td>
                      <td>{f.email || "-"}</td>
                      <td>{f.telefone}</td>
                      <td>{f.user?.email || "-"}</td>
                      <td>{new Date(f.createdAt).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </FuncionarioTable>
          </Card>

          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar funcionário ao solicitante">
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <Input
                placeholder="Nome"
                value={form.nome}
                onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
              />
              <Input
                placeholder="E-mail"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <Input
                placeholder="Telefone"
                value={form.telefone}
                onChange={(e) => setForm((prev) => ({ ...prev, telefone: e.target.value }))}
              />
              <Input
                placeholder="Senha inicial (opcional)"
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
                <Button variant="primary" onClick={handleCreateFuncionario} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar funcionário"}
                </Button>
              </div>
            </div>
          </Modal>
        </Wrapper>
      </MainContent>
    </AppShellContainer>
  );
}
