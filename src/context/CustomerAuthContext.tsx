"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

type CustomerUser = { id: string; email: string; name: string; role: string };
type CustomerCompany = { id: string; name: string; email: string };
type CustomerMember = { id: string; isAdmin: boolean };

type CustomerAuthState = {
  user: CustomerUser | null;
  company: CustomerCompany | null;
  member: CustomerMember | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthState | null>(null);

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [company, setCompany] = useState<CustomerCompany | null>(null);
  const [member, setMember] = useState<CustomerMember | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = async () => {
    const { res, json } = await fetchJson("/api/customer/me");
    if (!res.ok) {
      setUser(null);
      setCompany(null);
      setMember(null);
      return;
    }
    setUser(json.user || null);
    setCompany(json.company || null);
    setMember(json.member || null);
  };

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const { res, json } = await fetchJson("/api/customer/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      throw new Error(String(json?.error || "Login falhou"));
    }

    await refresh();
    router.push("/cliente");
  };

  const logout = async () => {
    await fetchJson("/api/customer/auth/logout", { method: "POST" });
    setUser(null);
    setCompany(null);
    setMember(null);
    router.push("/cliente/login");
  };

  const value = useMemo<CustomerAuthState>(() => ({
    user,
    company,
    member,
    loading,
    login,
    logout,
    refresh
  }), [user, company, member, loading]);

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}

