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

interface RequesterFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function RequesterForm({ initialData, onSubmit, onCancel, loading }: RequesterFormProps) {
  const [formData, setFormData] = React.useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    email: "",
    telefone: "",
    endereco_completo: ""
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <FormGroup>
        <label>Razão Social</label>
        <Input name="razao_social" value={formData.razao_social} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <label>Nome Fantasia</label>
        <Input name="nome_fantasia" value={formData.nome_fantasia} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <label>CNPJ</label>
        <Input name="cnpj" value={formData.cnpj} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <label>Email</label>
        <Input name="email" type="email" value={formData.email} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <label>Telefone</label>
        <Input name="telefone" value={formData.telefone} onChange={handleChange} />
      </FormGroup>
      <FormGroup>
        <label>Endereço Completo</label>
        <Input name="endereco_completo" value={formData.endereco_completo} onChange={handleChange} />
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
