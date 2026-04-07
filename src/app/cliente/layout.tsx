"use client";

import { ReactNode } from "react";
import Link from "next/link";
import styled from "styled-components";
import { CustomerAuthProvider, useCustomerAuth } from "@/context/CustomerAuthContext";
import { Button } from "@/components/ui/Button";

const Shell = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  background: ${({ theme }) => theme.colors.background};
`;

const Sidebar = styled.aside`
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Brand = styled.div`
  font-weight: 800;
  font-size: 1.05rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CompanyName = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const NavLink = styled(Link)`
  padding: 0.6rem 0.75rem;
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

const Content = styled.main`
  padding: 1.5rem;
`;

function SidebarInner() {
  const { company, member, logout, loading } = useCustomerAuth();

  return (
    <Sidebar>
      <div>
        <Brand>TicketBR · Cliente</Brand>
        <CompanyName>{loading ? "" : (company?.name || "")}</CompanyName>
      </div>

      <Nav>
        <NavLink href="/cliente">Painel</NavLink>
        {member?.isAdmin ? <NavLink href="/cliente/admin">Administração</NavLink> : null}
      </Nav>

      <div style={{ marginTop: "auto" }}>
        <Button type="button" variant="ghost" onClick={() => logout()} style={{ width: "100%", justifyContent: "center" }}>
          Sair
        </Button>
      </div>
    </Sidebar>
  );
}

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <CustomerAuthProvider>
      <Shell>
        <SidebarInner />
        <Content>{children}</Content>
      </Shell>
    </CustomerAuthProvider>
  );
}

