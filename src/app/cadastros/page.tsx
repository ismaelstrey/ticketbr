"use client";

import React from "react";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

const Page = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #111827;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
`;

export default function CadastrosPage() {
  const router = useRouter();

  return (
    <Page>
      <Title>Cadastros</Title>
      <Grid>
        <Card>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>Solicitantes</h3>
          <p style={{ margin: "0.5rem 0 1rem", color: "#6b7280" }}>Gerencie clientes/solicitantes cadastrados.</p>
          <Button variant="primary" onClick={() => router.push("/cadastros/solicitante")} style={{ width: "100%" }}>
            Abrir
          </Button>
        </Card>
        <Card>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>Operadores</h3>
          <p style={{ margin: "0.5rem 0 1rem", color: "#6b7280" }}>Gerencie operadores e perfis.</p>
          <Button variant="primary" onClick={() => router.push("/cadastros/operador")} style={{ width: "100%" }}>
            Abrir
          </Button>
        </Card>
        <Card>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>Usuários</h3>
          <p style={{ margin: "0.5rem 0 1rem", color: "#6b7280" }}>Gerencie usuários de acesso ao sistema.</p>
          <Button variant="primary" onClick={() => router.push("/cadastros/user")} style={{ width: "100%" }}>
            Abrir
          </Button>
        </Card>
      </Grid>
    </Page>
  );
}

