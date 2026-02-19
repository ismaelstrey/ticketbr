import React, { useEffect } from "react";
import styled from "styled-components";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #374151;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
`;

interface OperatorFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function OperatorForm({ initialData, onSubmit, onCancel, loading }: OperatorFormProps) {
  const [formData, setFormData] = React.useState({
    nome: "",
    email: "",
    matricula: "",
    perfil: "Tecnico",
    senha: ""
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData, senha: "" }); // Clear password on edit
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <FormGroup>
        <label>Nome</label>
        <Input name="nome" value={formData.nome} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <label>Email</label>
        <Input name="email" type="email" value={formData.email} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <label>Matrícula</label>
        <Input name="matricula" value={formData.matricula} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <label>Perfil</label>
        <Select name="perfil" value={formData.perfil} onChange={handleChange}>
          <option value="Admin">Admin</option>
          <option value="Tecnico">Técnico</option>
          <option value="Gestor">Gestor</option>
        </Select>
      </FormGroup>
      <FormGroup>
        <label>Senha {initialData && "(Deixe em branco para manter a atual)"}</label>
        <Input name="senha" type="password" value={formData.senha} onChange={handleChange} required={!initialData} />
      </FormGroup>

      <ButtonGroup>
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </ButtonGroup>
    </FormContainer>
  );
}
