"use client";

import styled from "styled-components";
import {
  FiHome,
  FiSearch,
  FiGrid,
  FiList,
  FiUsers,
  FiBookOpen,
  FiWifi,
  FiZap,
  FiSettings,
  FiHelpCircle,
  FiAlertCircle
} from "@/components/icons";

const SidebarContainer = styled.aside`
  background: ${({ theme }) => theme.colors.secondary};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 0.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

const Logo = styled.div`
  color: #f4f7fb;
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const MenuButton = styled.button`
  width: 28px;
  height: 28px;
  border: 1px solid #5f6c84;
  border-radius: 8px;
  background: transparent;
  color: #b9c4d6;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #b9c4d6;
    color: white;
  }
`;

const menuIcons = [
  FiHome,
  FiSearch,
  FiGrid,
  FiList,
  FiUsers,
  FiBookOpen,
  FiWifi,
  FiZap,
  FiSettings,
  FiHelpCircle,
  FiAlertCircle
];

export function Sidebar() {
  return (
    <SidebarContainer>
      <Logo>T</Logo>
      {menuIcons.map((Icon, index) => (
        <MenuButton key={index} aria-label={`menu-${index + 1}`} type="button">
          <Icon aria-hidden="true" />
        </MenuButton>
      ))}
    </SidebarContainer>
  );
}
