"use client";

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
  FiAlertCircle,
  FiMenu,
  FiChevronDown,
  FiChevronRight,
  FiLogOut,
  FiEdit,
  FiLayers
} from "@/components/icons";

const SidebarContainer = styled.aside<{ $isExpanded: boolean }>`
  background: ${({ theme }) => theme.colors.secondary};
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  width: ${({ $isExpanded }) => ($isExpanded ? "260px" : "64px")};
  transition: width 0.3s ease-in-out;
  overflow-y: auto;
  overflow-x: hidden;

  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: ${({ $isExpanded }) => ($isExpanded ? "260px" : "0")};
    /* transform: ${({ $isExpanded }) => ($isExpanded ? "translateX(0)" : "translateX(-100%)")}; */
    /* width is better for layout shifting if using grid, but absolute + transform is better for overlay */
  }
`;

const SidebarHeader = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isExpanded }) => ($isExpanded ? "space-between" : "center")};
  padding: 1rem 0.8rem;
  min-height: 64px;
`;

const Logo = styled.div<{ $isExpanded: boolean }>`
  color: #f4f7fb;
  font-size: 1.4rem;
  font-weight: 700;
  display: ${({ $isExpanded }) => ($isExpanded ? "block" : "none")};
  white-space: nowrap;
`;

const LogoSmall = styled.div<{ $isExpanded: boolean }>`
  color: #f4f7fb;
  font-size: 1.6rem;
  font-weight: 700;
  display: ${({ $isExpanded }) => ($isExpanded ? "none" : "block")};
`;

const ToggleButton = styled.button`
  background: transparent;
  border: none;
  color: #b9c4d6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border-radius: 4px;

  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const MenuList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.5rem;
  flex: 1;
`;

const MenuItemContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const MenuItem = styled.button<{ $isActive: boolean; $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.7rem 0.6rem;
  background: ${({ $isActive }) => ($isActive ? "rgba(66, 133, 244, 0.15)" : "transparent")};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: ${({ $isActive }) => ($isActive ? "#4285f4" : "#b9c4d6")};
  border-left: 3px solid ${({ $isActive }) => ($isActive ? "#4285f4" : "transparent")};
  transition: all 0.2s;
  justify-content: ${({ $isExpanded }) => ($isExpanded ? "flex-start" : "center")};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
  }

  svg {
    font-size: 1.2rem;
    min-width: 24px;
  }
`;

const MenuLabel = styled.span<{ $isExpanded: boolean }>`
  margin-left: 0.8rem;
  font-size: 0.9rem;
  font-weight: 500;
  display: ${({ $isExpanded }) => ($isExpanded ? "block" : "none")};
  white-space: nowrap;
  flex: 1;
  text-align: left;
`;

const ChevronIcon = styled.span<{ $isExpanded: boolean }>`
  display: ${({ $isExpanded }) => ($isExpanded ? "flex" : "none")};
  align-items: center;
  font-size: 1rem;
`;

const SubMenu = styled.div<{ $isOpen: boolean; $isExpanded: boolean }>`
  display: ${({ $isOpen, $isExpanded }) => ($isOpen && $isExpanded ? "flex" : "none")};
  flex-direction: column;
  padding-left: 2.5rem;
  gap: 0.2rem;
  margin-top: 0.2rem;
`;

const SubMenuItem = styled.a<{ $isActive: boolean }>`
  display: block;
  padding: 0.5rem 0.5rem;
  color: ${({ $isActive }) => ($isActive ? "white" : "#8b9bb4")};
  font-size: 0.85rem;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.05);
  }
`;

const MobileOverlay = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 90;
  display: ${({ $isVisible }) => ($isVisible ? "block" : "none")};
  
  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

interface MenuItemType {
  label: string;
  icon: React.ElementType;
  path?: string;
  subItems?: { label: string; path: string }[];
}

const menuItems: MenuItemType[] = [
  { label: "Dashboards", icon: FiHome, path: "/" },
  { label: "Tickets", icon: FiList, path: "/tickets", subItems: [
      { label: "Todos os Tickets", path: "/tickets" },
      { label: "Meus Tickets", path: "/tickets/me" },
      { label: "Abertos", path: "/tickets/open" }
    ] 
  },
  { label: "Chat", icon: FiUsers, path: "/chat" },
  { label: "Tarefas", icon: FiGrid, path: "/tasks" },
  { label: "Projetos", icon: FiBookOpen, path: "/projects" },
  { label: "Inventário", icon: FiWifi, path: "/inventory" },
  { label: "Relatórios", icon: FiZap, path: "/reports" },
  { label: "Cadastros", icon: FiEdit, path: "/cadastros", subItems: [
      { label: "Visão Geral", path: "/cadastros" },
      { label: "Solicitante", path: "/cadastros/solicitante" },
      { label: "Operador", path: "/cadastros/operador" },
      { label: "User", path: "/cadastros/user" }
    ]
  },
  { label: "Design System", icon: FiLayers, path: "/design-system" },
  { label: "Configurações", icon: FiSettings, path: "/settings" },
];

const UserSection = styled.div<{ $isExpanded: boolean }>`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem 0.8rem;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const UserInfo = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem;
  
  justify-content: ${({ $isExpanded }) => ($isExpanded ? "flex-start" : "center")};
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4285f4, #34a853);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.9rem;
  flex-shrink: 0;
`;

const UserDetails = styled.div<{ $isExpanded: boolean }>`
  display: ${({ $isExpanded }) => ($isExpanded ? "flex" : "none")};
  flex-direction: column;
  overflow: hidden;
`;

const UserName = styled.span`
  color: #f4f7fb;
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserRole = styled.span`
  color: #8b9bb4;
  font-size: 0.75rem;
  white-space: nowrap;
`;

const LogoutButton = styled.button<{ $isExpanded: boolean }>`
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem;
  border-radius: 8px;
  color: #ff6b6b;
  width: 100%;
  transition: all 0.2s;
  justify-content: ${({ $isExpanded }) => ($isExpanded ? "flex-start" : "center")};

  &:hover {
    background: rgba(255, 107, 107, 0.1);
  }

  span {
    display: ${({ $isExpanded }) => ($isExpanded ? "block" : "none")};
    font-size: 0.9rem;
    font-weight: 500;
  }
`;

export function Sidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  const activePath = pathname ?? "/";

  const activeLabels = useMemo(() => {
    const labels: string[] = [];
    for (const item of menuItems) {
      if (item.subItems?.some((sub) => activePath === sub.path || activePath.startsWith(`${sub.path}/`))) {
        labels.push(item.label);
      }
    }
    return labels;
  }, [activePath]);

  useEffect(() => {
    if (activeLabels.length > 0) {
      setOpenSubMenus((prev) => Array.from(new Set([...prev, ...activeLabels])));
    }
  }, [activeLabels]);

  const toggleSubMenu = (label: string) => {
    if (!isExpanded) {
        setIsExpanded(true);
        setOpenSubMenus([label]);
        return;
    }
    setOpenSubMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label) 
        : [...prev, label]
    );
  };

  const handleMenuClick = (item: MenuItemType) => {
    if (item.subItems) {
      toggleSubMenu(item.label);
    } else {
      if (item.path) {
        router.push(item.path);
        setIsExpanded(false);
      }
    }
  };

  return (
    <>
      <MobileOverlay $isVisible={isExpanded} onClick={() => setIsExpanded(false)} />
      {/* Spacer is only for desktop, on mobile sidebar is overlay */}
      <div 
        style={{ 
          width: isExpanded ? '260px' : '64px', 
          transition: 'width 0.3s ease-in-out', 
          flexShrink: 0,
          display: 'block'
        }} 
        className="sidebar-spacer" 
      />
      <style jsx>{`
        @media (max-width: 768px) {
          .sidebar-spacer {
            display: none !important;
          }
        }
      `}</style>
      <SidebarContainer $isExpanded={isExpanded}>
        <SidebarHeader $isExpanded={isExpanded}>
          <Logo $isExpanded={isExpanded}>TicketBR</Logo>
          <LogoSmall $isExpanded={isExpanded}>T</LogoSmall>
          <ToggleButton onClick={toggleSidebar} aria-label="Toggle Sidebar">
            <FiMenu />
          </ToggleButton>
        </SidebarHeader>

        <MenuList>
          {menuItems.map((item, index) => {
            const isActive = activePath === item.path;
            const hasSubItems = !!item.subItems;
            const isSubMenuOpen = openSubMenus.includes(item.label);

            return (
              <MenuItemContainer key={index}>
                <MenuItem 
                  $isActive={isActive} 
                  $isExpanded={isExpanded}
                  onClick={() => handleMenuClick(item)}
                  title={!isExpanded ? item.label : ""}
                >
                  <item.icon />
                  <MenuLabel $isExpanded={isExpanded}>{item.label}</MenuLabel>
                  {hasSubItems && (
                    <ChevronIcon $isExpanded={isExpanded}>
                      {isSubMenuOpen ? <FiChevronDown /> : <FiChevronRight />}
                    </ChevronIcon>
                  )}
                </MenuItem>
                
                {hasSubItems && (
                  <SubMenu $isOpen={isSubMenuOpen} $isExpanded={isExpanded}>
                    {item.subItems!.map((sub, subIndex) => (
                      <SubMenuItem 
                        key={subIndex} 
                        href={sub.path} 
                        $isActive={activePath === sub.path || activePath.startsWith(`${sub.path}/`)}
                        onClick={(e) => {
                            e.preventDefault();
                            router.push(sub.path);
                            setIsExpanded(false);
                        }}
                      >
                        {sub.label}
                      </SubMenuItem>
                    ))}
                  </SubMenu>
                )}
              </MenuItemContainer>
            );
          })}
        </MenuList>

        {user && (
          <UserSection $isExpanded={isExpanded}>
            <UserInfo $isExpanded={isExpanded}>
              <UserAvatar>{user.name.charAt(0).toUpperCase()}</UserAvatar>
              {isExpanded && (
                <UserDetails $isExpanded={isExpanded}>
                  <UserName>{user.name}</UserName>
                  <UserRole>{user.role}</UserRole>
                </UserDetails>
              )}
            </UserInfo>
            <LogoutButton $isExpanded={isExpanded} onClick={logout} title={!isExpanded ? "Sair" : ""}>
              <FiLogOut />
              <span>Sair</span>
            </LogoutButton>
          </UserSection>
        )}
      </SidebarContainer>
    </>
  );
}
