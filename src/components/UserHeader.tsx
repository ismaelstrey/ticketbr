"use client";

import { useAuth } from "@/context/AuthContext";

export default function UserHeader() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="user-header">
      <div className="user-info">
        <h1>TicketBR</h1>
        <p>Olá, {user.name} ({user.role})</p>
      </div>
      <button
        onClick={logout}
        className="logout-button"
      >
        Sair
      </button>
    </header>
  );
}
