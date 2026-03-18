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
import { FiEdit2 } from "react-icons/fi";

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
  remoteJid?: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  whatsappContact?: {
    id: string;
    remoteJid: string;
    pushName: string | null;
  } | null;
};

const Wrapper = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Card = styled.section`
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  padding: 1rem;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const CardTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ActionRow = styled.div`
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
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
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-radius: 14px;
  padding: 0.8rem;
`;

const Label = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 0.25rem;
`;

const Value = styled.div`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
  word-break: break-word;
`;

const SectionTitle = styled.h3`
  margin-top: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatusText = styled.p<{ $tone?: "error" }>`
  color: ${({ theme, $tone }) => ($tone === "error" ? theme.colors.status.warning : theme.colors.text.secondary)};
`;

const FuncionarioTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.75rem;

  th,
  td {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    text-align: left;
    padding: 0.55rem;
    font-size: 0.86rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  th {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

const EmptyRow = styled.td`
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EditButton = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  border-radius: 8px;
  padding: 0.3rem 0.45rem;
  cursor: pointer;
`;

const ModalForm = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
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
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    whatsappNumber: "",
    password: ""
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

  const handleSubmitFuncionario = async () => {
    try {
      setSaving(true);
      const endpoint = editingFuncionario
        ? `/api/solicitantes/${params.id}/funcionarios/${editingFuncionario.id}`
        : `/api/solicitantes/${params.id}/funcionarios`;

      const res = await fetch(endpoint, {
        method: editingFuncionario ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erro ao cadastrar funcionário");

      showToast(editingFuncionario ? "Funcionário atualizado com sucesso." : "Funcionário vinculado ao solicitante com sucesso.", "success");
      setIsModalOpen(false);
      setEditingFuncionario(null);
      setForm({ nome: "", email: "", telefone: "", whatsappNumber: "", password: "" });
      await loadFuncionarios(params.id);
    } catch (err: any) {
      showToast(err?.message || "Erro ao cadastrar funcionário", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario);
    setForm({
      nome: funcionario.nome || "",
      email: funcionario.email || "",
      telefone: funcionario.telefone || "",
      whatsappNumber: funcionario.whatsappContact?.remoteJid || funcionario.remoteJid || "",
      password: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingFuncionario(null);
    setForm({ nome: "", email: "", telefone: "", whatsappNumber: "", password: "" });
    setIsModalOpen(true);
  };

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <Wrapper>
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Solicitante</CardTitle>
              <ActionRow>
                <Button variant="primary" onClick={handleOpenCreate}>Adicionar Funcionário</Button>
                <Button variant="ghost" onClick={() => router.push("/cadastros/solicitante")}>Voltar</Button>
              </ActionRow>
            </CardHeader>

            {loading && <StatusText>Carregando...</StatusText>}
            {error && <StatusText $tone="error">{error}</StatusText>}

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
            <SectionTitle>Funcionários vinculados</SectionTitle>
            <FuncionarioTable>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>WhatsApp</th>
                  <th>Usuário</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.length === 0 ? (
                  <tr>
                    <EmptyRow colSpan={7}>Nenhum funcionário vinculado.</EmptyRow>
                  </tr>
                ) : (
                  funcionarios.map((f) => (
                    <tr key={f.id}>
                      <td>{f.nome}</td>
                      <td>{f.email || "-"}</td>
                      <td>{f.telefone}</td>
                      <td>{f.whatsappContact?.remoteJid || f.remoteJid || "Não vinculado"}</td>
                      <td>{f.user?.email || "-"}</td>
                      <td>{new Date(f.createdAt).toLocaleString("pt-BR")}</td>
                      <td>
                        <EditButton type="button" onClick={() => handleOpenEdit(f)} aria-label={`Editar ${f.nome}`}>
                          <FiEdit2 aria-hidden="true" />
                        </EditButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </FuncionarioTable>
          </Card>

          <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingFuncionario(null); }} title={editingFuncionario ? "Editar funcionário" : "Adicionar funcionário ao solicitante"}>
            <ModalForm>
              <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} />
              <Input placeholder="E-mail" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              <Input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm((prev) => ({ ...prev, telefone: e.target.value }))} />
              <Input placeholder="Celular com WhatsApp (ex: 5511999999999)" value={form.whatsappNumber} onChange={(e) => setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))} />
              {!editingFuncionario && (
                <Input placeholder="Senha inicial (opcional)" type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
              )}
              <ModalActions>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
                <Button variant="primary" onClick={handleSubmitFuncionario} disabled={saving}>
                  {saving ? "Salvando..." : editingFuncionario ? "Salvar alterações" : "Salvar funcionário"}
                </Button>
              </ModalActions>
            </ModalForm>
          </Modal>
        </Wrapper>
      </MainContent>
    </AppShellContainer>
  );
}
