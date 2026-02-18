"use client";

import styled from "styled-components";
import { FiLogOut, FiUser } from "@/components/icons";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  height: 60px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
    height: auto;
    gap: 0.5rem;
    padding: 0.75rem;
    align-items: stretch;
  }
`;

const Brand = styled.div`
  font-weight: 700;
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    justify-content: space-between;
  }
`;

const UserProfile = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.2;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    align-items: flex-start;
  }
`;

const UserName = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const UserRole = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const LogoutButton = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.3rem;

  &:hover {
    background-color: #f3f4f6;
    color: #dc2626;
    border-color: #d1d5db;
  }
`;

export function UserHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <HeaderContainer>
      <Brand>
        TicketBR <small style={{ fontWeight: 400, fontSize: "0.8rem", color: "#666" }}>v0.1.0</small>
      </Brand>
      
      <Controls>
        {user && (
          <UserProfile>
            <UserName>{user.name}</UserName>
            <UserRole>{user.role}</UserRole>
          </UserProfile>
        )}
        
        <LogoutButton onClick={handleLogout} title="Sair do sistema">
          <FiLogOut /> Sair
        </LogoutButton>
      </Controls>
    </HeaderContainer>
  );
}
