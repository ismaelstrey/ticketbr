"use client";

import { useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const PageContainer = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.background};
  padding: 1rem;
`;

const FormCard = styled(Card)`
  padding: 2rem;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h1`
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Feedback = styled.div<{ $tone: "success" | "error" }>`
  margin-bottom: 1rem;
  font-size: 0.875rem;
  text-align: center;
  color: ${({ theme, $tone }) =>
    $tone === "success" ? theme.colors.status.success : theme.colors.status.warning};
`;

const FormStack = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const BackLink = styled(Link)`
  margin-top: 1.25rem;
  font-size: 0.875rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/customer/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setTone("error");
        setFeedback(String(json?.error || "Não foi possível enviar o link."));
        return;
      }

      setTone("success");
      setFeedback(
        String(json?.message || "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.")
      );
      setEmail("");
    } catch {
      setTone("error");
      setFeedback("Falha de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer>
      <FormCard>
        <Title>Recuperar senha</Title>
        <Subtitle>Informe o e-mail cadastrado para receber o link de redefinição.</Subtitle>

        {feedback ? <Feedback $tone={tone}>{feedback}</Feedback> : null}

        <FormStack onSubmit={handleSubmit}>
          <div>
            <FormLabel htmlFor="email">Email</FormLabel>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {submitting ? "Enviando..." : "Enviar link"}
          </Button>
        </FormStack>

        <BackLink href="/cliente/login">Voltar para o login</BackLink>
      </FormCard>
    </PageContainer>
  );
}
