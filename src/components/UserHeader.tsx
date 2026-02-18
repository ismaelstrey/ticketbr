"use client";

import { useAuth } from "@/context/AuthContext";

export default function UserHeader() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="user-header">
      <div className="user-brand">
        TicketBR
      </div>
      <div className="user-controls">
        <div className="user-profile">
          <span className="user-name">{user.name}</span>
          <span className="user-role">{user.role}</span>
        </div>
        <button
          onClick={logout}
          className="logout-button"
          aria-label="Sair do sistema"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
