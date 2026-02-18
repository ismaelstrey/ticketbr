"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const LoginContainer = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.background};
`;

const LoginCard = styled(Card)`
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ErrorMessage = styled.div`
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.status.warning};
  font-size: 0.875rem;
  text-align: center;
`;

const FormStack = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const Footer = styled.p`
  margin-top: 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError("Falha no login. Verifique suas credenciais.");
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Title>TicketBR Login</Title>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <FormStack onSubmit={handleSubmit}>
          <div>
            <FormLabel htmlFor="email">Email</FormLabel>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ticketbr.com"
              required
            />
          </div>
          
          <div>
            <FormLabel htmlFor="password">Senha</FormLabel>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
              required
            />
          </div>

          <Button type="submit" variant="primary" style={{ width: "100%", justifyContent: "center" }}>
            Entrar
          </Button>
        </FormStack>

        <Footer>
          Sistema de Gestão de Tickets
        </Footer>
      </LoginCard>
    </LoginContainer>
  );
}
