"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, marginBottom: 6 };

export default function CustomerProfilePage() {
  const { user, company, refresh } = useCustomerAuth();

  const [name, setName] = useState("");
  const [nameFeedback, setNameFeedback] = useState("");
  const [nameTone, setNameTone] = useState<"success" | "error">("success");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [passwordTone, setPasswordTone] = useState<"success" | "error">("success");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  // Salva o novo nome do usuário e atualiza o contexto de autenticação
  const handleSaveName = async (event: React.FormEvent) => {
    event.preventDefault();
    setNameFeedback("");
    setSavingName(true);

    try {
      const res = await fetch("/api/customer/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setNameTone("error");
        setNameFeedback(String(json?.error || "Não foi possível salvar."));
        return;
      }

      setNameTone("success");
      setNameFeedback("Dados atualizados com sucesso.");
      await refresh();
    } catch {
      setNameTone("error");
      setNameFeedback("Falha de conexão. Tente novamente.");
    } finally {
      setSavingName(false);
    }
  };

  // Troca a senha exigindo a confirmação da senha atual
  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordFeedback("");

    if (newPassword.length < 8) {
      setPasswordTone("error");
      setPasswordFeedback("A nova senha deve ter ao menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordTone("error");
      setPasswordFeedback("As senhas não coincidem.");
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/customer/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPasswordTone("error");
        setPasswordFeedback(String(json?.error || "Não foi possível alterar a senha."));
        return;
      }

      setPasswordTone("success");
      setPasswordFeedback("Senha alterada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordTone("error");
      setPasswordFeedback("Falha de conexão. Tente novamente.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem", maxWidth: 640 }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>Meus dados</h1>

      <Card style={{ padding: "1rem" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid" }}>
            <span style={labelStyle}>Email</span>
            <span style={{ opacity: 0.8 }}>{user?.email || "-"}</span>
          </div>
          <div style={{ display: "grid" }}>
            <span style={labelStyle}>Empresa</span>
            <span style={{ opacity: 0.8 }}>{company?.name || "-"}</span>
          </div>
        </div>
      </Card>

      <Card style={{ padding: "1rem" }}>
        <form onSubmit={handleSaveName} style={{ display: "grid", gap: 10 }}>
          <strong>Perfil</strong>
          {nameFeedback ? (
            <div style={{ fontSize: 14, color: nameTone === "success" ? "#16A34A" : "#DC2626" }}>
              {nameFeedback}
            </div>
          ) : null}
          <div>
            <div style={labelStyle}>Nome</div>
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div>
            <Button type="submit" variant="primary" disabled={savingName}>
              {savingName ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Card>

      <Card style={{ padding: "1rem" }}>
        <form onSubmit={handleChangePassword} style={{ display: "grid", gap: 10 }}>
          <strong>Alterar senha</strong>
          {passwordFeedback ? (
            <div style={{ fontSize: 14, color: passwordTone === "success" ? "#16A34A" : "#DC2626" }}>
              {passwordFeedback}
            </div>
          ) : null}
          <div>
            <div style={labelStyle}>Senha atual</div>
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </div>
          <div>
            <div style={labelStyle}>Nova senha</div>
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </div>
          <div>
            <div style={labelStyle}>Confirmar nova senha</div>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
          <div>
            <Button type="submit" variant="primary" disabled={savingPassword}>
              {savingPassword ? "Salvando..." : "Alterar senha"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
