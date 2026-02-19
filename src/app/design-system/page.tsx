"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { FiCheck, FiX, FiAlertCircle } from "react-icons/fi";

const Container = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
`;

const SubTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
`;

const Flex = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
`;

const ColorSwatch = styled.div<{ color: string }>`
  width: 100%;
  height: 80px;
  background-color: ${({ color }) => color};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const CodeBlock = styled.pre`
  background: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 0.85rem;
`;

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  return (
    <Container>
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "#111827", marginBottom: "0.5rem" }}>
          Design System & UI Kit
        </h1>
        <p style={{ color: "#6b7280" }}>
          Documentação dos componentes de interface, padrões de cores e tipografia do TicketBR.
        </p>
      </div>

      <Section>
        <Title>Cores</Title>
        <Grid>
          <div>
            <SubTitle>Primary</SubTitle>
            <ColorSwatch color="#3b82f6">#3b82f6</ColorSwatch>
          </div>
          <div>
            <SubTitle>Secondary</SubTitle>
            <ColorSwatch color="#1f2937">#1f2937</ColorSwatch>
          </div>
          <div>
            <SubTitle>Success</SubTitle>
            <ColorSwatch color="#10b981">#10b981</ColorSwatch>
          </div>
          <div>
            <SubTitle>Danger</SubTitle>
            <ColorSwatch color="#ef4444">#ef4444</ColorSwatch>
          </div>
          <div>
            <SubTitle>Warning</SubTitle>
            <ColorSwatch color="#f59e0b">#f59e0b</ColorSwatch>
          </div>
        </Grid>
      </Section>

      <Section>
        <Title>Botões</Title>
        <Flex>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary">
            <FiCheck /> With Icon
          </Button>
        </Flex>
      </Section>

      <Section>
        <Title>Formulários</Title>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "600px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Input Texto</label>
            <Input placeholder="Digite algo..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Select</label>
            <Select>
              <option>Opção 1</option>
              <option>Opção 2</option>
              <option>Opção 3</option>
            </Select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Textarea</label>
            <Textarea placeholder="Digite um texto longo..." rows={4} />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#ef4444" }}>
              Input com Erro
            </label>
            <Input style={{ borderColor: "#ef4444" }} placeholder="Erro..." />
            <span style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <FiAlertCircle /> Campo obrigatório
            </span>
          </div>
        </div>
      </Section>

      <Section>
        <Title>Cards & Layout</Title>
        <Grid>
          <Card>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Card Simples</h3>
            <p style={{ color: "#666" }}>Este é um componente de cartão padrão utilizado para agrupar conteúdo relacionado.</p>
          </Card>
          <Card>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Card com Ação</h3>
            <p style={{ color: "#666", marginBottom: "1rem" }}>Conteúdo com botão de ação.</p>
            <Button variant="ghost" style={{ width: "100%" }}>Ver Detalhes</Button>
          </Card>
        </Grid>
      </Section>

      <Section>
        <Title>Feedback & Modais</Title>
        <Flex>
          <Button onClick={() => setModalOpen(true)}>Abrir Modal de Exemplo</Button>
        </Flex>
        
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Modal de Exemplo"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p>Este é um exemplo de modal utilizando o componente reutilizável do sistema.</p>
            <p>Ele suporta acessibilidade (foco, teclado), overlay escuro e conteúdo flexível.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>Confirmar</Button>
            </div>
          </div>
        </Modal>
      </Section>
    </Container>
  );
}
