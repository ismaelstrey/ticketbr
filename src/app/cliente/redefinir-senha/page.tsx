"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [feedback, setFeedback] = useState("");
  const [tone, setTone] = useState<"success" | "error">("error");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback("");

    if (password.length < 8) {
      setTone("error");
      setFeedback("A senha deve ter ao menos 8 caracteres.");
      return;
    }

    if (password !== confirm) {
      setTone("error");
      setFeedback("As senhas não coincidem.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/customer/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setTone("error");
        setFeedback(String(json?.error || "Não foi possível redefinir a senha."));
        return;
      }

      setTone("success");
      setFeedback("Senha redefinida com sucesso. Redirecionando para o login...");
      setTimeout(() => router.push("/cliente/login"), 1500);
    } catch {
      setTone("error");
      setFeedback("Falha de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <FormCard>
        <Title>Link inválido</Title>
        <Subtitle>O link de redefinição está incompleto ou expirou. Solicite um novo.</Subtitle>
        <BackLink href="/cliente/esqueci-senha">Solicitar novo link</BackLink>
      </FormCard>
    );
  }

  return (
    <FormCard>
      <Title>Redefinir senha</Title>
      <Subtitle>Escolha uma nova senha para acessar o portal.</Subtitle>

      {feedback ? <Feedback $tone={tone}>{feedback}</Feedback> : null}

      <FormStack onSubmit={handleSubmit}>
        <div>
          <FormLabel htmlFor="password">Nova senha</FormLabel>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="********"
            required
          />
        </div>

        <div>
          <FormLabel htmlFor="confirm">Confirmar senha</FormLabel>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="********"
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {submitting ? "Salvando..." : "Redefinir senha"}
        </Button>
      </FormStack>

      <BackLink href="/cliente/login">Voltar para o login</BackLink>
    </FormCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <PageContainer>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </PageContainer>
  );
}
