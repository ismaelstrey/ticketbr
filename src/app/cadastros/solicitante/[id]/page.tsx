"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styled from "styled-components";
import { AppShellContainer, MainContent } from "@/components/layout/AppShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";

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
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
};

const Wrapper = styled.div`
  padding: 1rem;
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

export default function SolicitanteDetalhesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Solicitante | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOne = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/solicitantes/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Erro ao carregar solicitante");
        setData(json.data || null);
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar solicitante");
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) fetchOne();
  }, [params?.id]);

  return (
    <AppShellContainer>
      <Sidebar />
      <MainContent>
        <Wrapper>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Detalhes do Solicitante</h2>
              <Button variant="ghost" onClick={() => router.push("/cadastros/solicitante")}>Voltar</Button>
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
        </Wrapper>
      </MainContent>
    </AppShellContainer>
  );
}
