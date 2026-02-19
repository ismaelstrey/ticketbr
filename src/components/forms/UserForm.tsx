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

interface UserFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function UserForm({ initialData, onSubmit, onCancel, loading }: UserFormProps) {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    role: "AGENT",
    password: ""
  });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData, password: "" });
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
        <Input name="name" value={formData.name} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <label>Email</label>
        <Input name="email" type="email" value={formData.email} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <label>Role</label>
        <Select name="role" value={formData.role} onChange={handleChange}>
          <option value="ADMIN">Admin</option>
          <option value="AGENT">Agent</option>
          <option value="CUSTOMER">Customer</option>
        </Select>
      </FormGroup>
      <FormGroup>
        <label>Senha {initialData && "(Deixe em branco para manter a atual)"}</label>
        <Input name="password" type="password" value={formData.password} onChange={handleChange} required={!initialData} />
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
