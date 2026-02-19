"use client";

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { formatCpfCnpj, onlyDigits, validateCnpj, validateCpf } from "@/lib/cpfCnpj";
import { formatPhone } from "@/lib/phone";

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 700;
  color: #374151;
`;

const ErrorText = styled.div`
  font-size: 0.82rem;
  color: #b91c1c;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.5rem;
`;

type FormState = {
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  enderecoCompleto: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

interface Props {
  initialData?: any | null;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function SolicitanteForm({ initialData, onSubmit, onCancel, loading }: Props) {
  const [values, setValues] = useState<FormState>({
    nome: "",
    cpfCnpj: "",
    email: "",
    telefone: "",
    enderecoCompleto: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});

  useEffect(() => {
    if (initialData) {
      setValues({
        nome: initialData.nome_fantasia ?? "",
        cpfCnpj: formatCpfCnpj(initialData.cnpj ?? ""),
        email: initialData.email ?? "",
        telefone: formatPhone(initialData.telefone ?? ""),
        enderecoCompleto: initialData.endereco_completo ?? "",
      });
      setTouched({});
    } else {
      setValues({
        nome: "",
        cpfCnpj: "",
        email: "",
        telefone: "",
        enderecoCompleto: "",
      });
      setTouched({});
    }
  }, [initialData]);

  const errors: Errors = useMemo(() => {
    const e: Errors = {};

    if (!values.nome.trim() || values.nome.trim().length < 2) e.nome = "Informe o nome.";

    const cpfCnpjDigits = onlyDigits(values.cpfCnpj);
    if (cpfCnpjDigits.length === 0) {
      e.cpfCnpj = "Informe o CPF/CNPJ.";
    } else if (cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14) {
      e.cpfCnpj = "CPF/CNPJ deve ter 11 ou 14 dígitos.";
    } else if (cpfCnpjDigits.length === 11 && !validateCpf(cpfCnpjDigits)) {
      e.cpfCnpj = "CPF inválido.";
    } else if (cpfCnpjDigits.length === 14 && !validateCnpj(cpfCnpjDigits)) {
      e.cpfCnpj = "CNPJ inválido.";
    }

    if (!values.email.trim()) e.email = "Informe o e-mail.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) e.email = "E-mail inválido.";

    const phoneDigits = onlyDigits(values.telefone);
    if (phoneDigits.length < 10) e.telefone = "Informe um telefone válido.";

    if (!values.enderecoCompleto.trim() || values.enderecoCompleto.trim().length < 5) e.enderecoCompleto = "Informe o endereço completo.";

    return e;
  }, [values]);

  const canSubmit = Object.keys(errors).length === 0;

  const markTouched = (key: keyof FormState) => setTouched((prev) => ({ ...prev, [key]: true }));

  const handleChange = (key: keyof FormState, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ nome: true, cpfCnpj: true, email: true, telefone: true, enderecoCompleto: true });
    if (!canSubmit) return;

    onSubmit({
      nome: values.nome.trim(),
      cpfCnpj: onlyDigits(values.cpfCnpj),
      email: values.email.trim(),
      telefone: onlyDigits(values.telefone),
      enderecoCompleto: values.enderecoCompleto.trim(),
    });
  };

  return (
    <Form onSubmit={handleSubmit} aria-busy={loading}>
      <Row>
        <Field>
          <Label htmlFor="solicitante-nome">Nome completo</Label>
          <Input
            id="solicitante-nome"
            value={values.nome}
            onChange={(e) => handleChange("nome", e.target.value)}
            onBlur={() => markTouched("nome")}
            required
            aria-invalid={touched.nome && !!errors.nome}
            aria-describedby={errors.nome ? "solicitante-nome-err" : undefined}
          />
          {touched.nome && errors.nome && <ErrorText id="solicitante-nome-err">{errors.nome}</ErrorText>}
        </Field>

        <Field>
          <Label htmlFor="solicitante-cpfcnpj">CPF/CNPJ</Label>
          <Input
            id="solicitante-cpfcnpj"
            inputMode="numeric"
            value={values.cpfCnpj}
            onChange={(e) => handleChange("cpfCnpj", formatCpfCnpj(e.target.value))}
            onBlur={() => markTouched("cpfCnpj")}
            required
            aria-invalid={touched.cpfCnpj && !!errors.cpfCnpj}
            aria-describedby={errors.cpfCnpj ? "solicitante-cpfcnpj-err" : undefined}
          />
          {touched.cpfCnpj && errors.cpfCnpj && <ErrorText id="solicitante-cpfcnpj-err">{errors.cpfCnpj}</ErrorText>}
        </Field>
      </Row>

      <Row>
        <Field>
          <Label htmlFor="solicitante-email">E-mail</Label>
          <Input
            id="solicitante-email"
            type="email"
            value={values.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => markTouched("email")}
            required
            aria-invalid={touched.email && !!errors.email}
            aria-describedby={errors.email ? "solicitante-email-err" : undefined}
          />
          {touched.email && errors.email && <ErrorText id="solicitante-email-err">{errors.email}</ErrorText>}
        </Field>

        <Field>
          <Label htmlFor="solicitante-telefone">Telefone</Label>
          <Input
            id="solicitante-telefone"
            inputMode="tel"
            value={values.telefone}
            onChange={(e) => handleChange("telefone", formatPhone(e.target.value))}
            onBlur={() => markTouched("telefone")}
            required
            aria-invalid={touched.telefone && !!errors.telefone}
            aria-describedby={errors.telefone ? "solicitante-telefone-err" : undefined}
          />
          {touched.telefone && errors.telefone && <ErrorText id="solicitante-telefone-err">{errors.telefone}</ErrorText>}
        </Field>
      </Row>

      <Field>
        <Label htmlFor="solicitante-endereco">Endereço completo</Label>
        <Textarea
          id="solicitante-endereco"
          rows={4}
          value={values.enderecoCompleto}
          onChange={(e) => handleChange("enderecoCompleto", e.target.value)}
          onBlur={() => markTouched("enderecoCompleto")}
          required
          aria-invalid={touched.enderecoCompleto && !!errors.enderecoCompleto}
          aria-describedby={errors.enderecoCompleto ? "solicitante-endereco-err" : undefined}
        />
        {touched.enderecoCompleto && errors.enderecoCompleto && <ErrorText id="solicitante-endereco-err">{errors.enderecoCompleto}</ErrorText>}
      </Field>

      <Actions>
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={loading || !canSubmit}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </Actions>
    </Form>
  );
}
