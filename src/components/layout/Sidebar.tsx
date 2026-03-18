"use client";

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  FiHome,
  FiGrid,
  FiList,
  FiUsers,
  FiBookOpen,
  FiWifi,
  FiZap,
  FiSettings,
  FiMenu,
  FiChevronDown,
  FiChevronRight,
  FiLogOut,
  FiEdit,
  FiLayers
} from "@/components/icons";

const EXPANDED_WIDTH = "288px";
const COLLAPSED_WIDTH = "84px";

const SidebarContainer = styled.aside<{ $isExpanded: boolean }>`
  background: ${({ theme }) => theme.colors.sidebar.background};
  border-right: 1px solid ${({ theme }) => theme.colors.sidebar.border};
  backdrop-filter: blur(18px);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.22);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  width: ${({ $isExpanded }) => ($isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH)};
  transition: width 0.28s ease, box-shadow 0.28s ease;
  overflow-y: auto;
  overflow-x: hidden;

  &:hover {
    box-shadow: 0 24px 50px rgba(15, 23, 42, 0.3);
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.borderStrong};
    border-radius: 999px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: ${({ $isExpanded }) => ($isExpanded ? EXPANDED_WIDTH : "0")};
    border-right-width: ${({ $isExpanded }) => ($isExpanded ? "1px" : "0")};
  }
`;

const SidebarHeader = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isExpanded }) => ($isExpanded ? "space-between" : "center")};
  padding: 1rem 1rem 0.75rem;
  min-height: 72px;
  gap: 0.75rem;
`;

const Brand = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
  opacity: ${({ $isExpanded }) => ($isExpanded ? 1 : 0.96)};
`;

const BrandMark = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: linear-gradient(135deg, #38bdf8 0%, #6366f1 55%, #8b5cf6 100%);
  box-shadow: 0 14px 28px rgba(99, 102, 241, 0.32);
  color: ${({ theme }) => theme.colors.text.primary};
  display: grid;
  place-items: center;
  font-size: 1.15rem;
  font-weight: 800;
  flex-shrink: 0;
`;

const BrandText = styled.div<{ $isExpanded: boolean }>`
  display: ${({ $isExpanded }) => ($isExpanded ? "flex" : "none")};
  flex-direction: column;
  min-width: 0;
`;

const BrandTitle = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
`;

const BrandSubtitle = styled.span`
  color: ${({ theme }) => theme.colors.sidebar.muted};
  font-size: 0.75rem;
  white-space: nowrap;
`;

const ToggleButton = styled.button<{ $isExpanded: boolean }>`
  background: rgba(15, 23, 42, 0.35);
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: ${({ $isExpanded }) => ($isExpanded ? "#e2e8f0" : "#94a3b8")};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 12px;
  flex-shrink: 0;
  transition: all 0.2s ease;

  &:hover {
    color: white;
    background: rgba(59, 130, 246, 0.18);
    border-color: rgba(96, 165, 250, 0.35);
  }
`;

const SectionLabel = styled.span<{ $isExpanded: boolean }>`
  display: ${({ $isExpanded }) => ($isExpanded ? "block" : "none")};
  padding: 0 1.2rem;
  margin: 0.4rem 0 0.3rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const MenuList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem 1rem;
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
  padding: 0.78rem 0.85rem;
  background: ${({ $isActive }) =>
    $isActive
      ? "linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(99, 102, 241, 0.2))"
      : "transparent"};
  border: 1px solid ${({ $isActive }) => ($isActive ? "rgba(96, 165, 250, 0.3)" : "transparent")};
  border-radius: 18px;
  cursor: pointer;
  color: ${({ $isActive, theme }) => ($isActive ? theme.colors.sidebar.activeText : theme.colors.text.secondary)};
  transition: all 0.22s ease;
  justify-content: ${({ $isExpanded }) => ($isExpanded ? "flex-start" : "center")};
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent 58%);
    opacity: ${({ $isActive }) => ($isActive ? 1 : 0)};
    transition: opacity 0.22s ease;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(30, 64, 175, 0.18));
    color: white;
    border-color: rgba(96, 165, 250, 0.22);
    transform: translateX(2px);
  }

  &:hover::before {
    opacity: 1;
  }
`;

const IconWrap = styled.span<{ $isActive: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $isActive, theme }) => ($isActive ? theme.colors.text.white : theme.colors.sidebar.icon)};
  background: ${({ $isActive, theme }) =>
    $isActive
      ? "linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(99, 102, 241, 0.92))"
      : theme.colors.surfaceAlt};
  box-shadow: ${({ $isActive }) =>
    $isActive ? "0 12px 24px rgba(59, 130, 246, 0.28)" : "inset 0 0 0 1px rgba(148, 163, 184, 0.1)"};
  transition: all 0.22s ease;
  position: relative;
  z-index: 1;

  ${MenuItem}:hover & {
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.92), rgba(99, 102, 241, 0.92));
    color: #eff6ff;
    box-shadow: 0 12px 24px rgba(56, 189, 248, 0.22);
  }

  svg {
    font-size: 1.05rem;
  }
`;

const MenuLabel = styled.span<{ $isExpanded: boolean }>`
  margin-left: 0.9rem;
  font-size: 0.94rem;
  font-weight: 600;
  display: ${({ $isExpanded }) => ($isExpanded ? "block" : "none")};
  white-space: nowrap;
  flex: 1;
  text-align: left;
  position: relative;
  z-index: 1;
`;

const ChevronIcon = styled.span<{ $isExpanded: boolean }>`
  display: ${({ $isExpanded }) => ($isExpanded ? "flex" : "none")};
  align-items: center;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.muted};
  position: relative;
  z-index: 1;
`;

const SubMenu = styled.div<{ $isOpen: boolean; $isExpanded: boolean }>`
  display: ${({ $isOpen, $isExpanded }) => ($isOpen && $isExpanded ? "flex" : "none")};
  flex-direction: column;
  padding: 0.35rem 0 0 3.65rem;
  gap: 0.25rem;
`;

const SubMenuItem = styled.a<{ $isActive: boolean }>`
  display: block;
  padding: 0.68rem 0.8rem;
  color: ${({ $isActive, theme }) => ($isActive ? theme.colors.text.primary : theme.colors.text.muted)};
  font-size: 0.84rem;
  text-decoration: none;
  border-radius: 14px;
  background: ${({ $isActive }) => ($isActive ? "rgba(59, 130, 246, 0.14)" : "transparent")};
  border: 1px solid ${({ $isActive }) => ($isActive ? "rgba(96, 165, 250, 0.18)" : "transparent")};
  transition: all 0.18s ease;

  &:hover {
    color: white;
    background: rgba(30, 41, 59, 0.78);
    border-color: rgba(148, 163, 184, 0.14);
  }
`;

const MobileOverlay = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.55);
  backdrop-filter: blur(4px);
  z-index: 90;
  display: ${({ $isVisible }) => ($isVisible ? "block" : "none")};

  @media (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

const SidebarSpacer = styled.div<{ $isExpanded: boolean }>`
  width: ${({ $isExpanded }) => ($isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH)};
  transition: width 0.28s ease;
  flex-shrink: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
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
  {
    label: "Tickets",
    icon: FiList,
    path: "/tickets",
    subItems: [
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
  {
    label: "Cadastros",
    icon: FiEdit,
    path: "/cadastros",
    subItems: [
      { label: "Visão Geral", path: "/cadastros" },
      { label: "Solicitante", path: "/cadastros/solicitante" },
      { label: "Operador", path: "/cadastros/operador" },
      { label: "User", path: "/cadastros/user" }
    ]
  },
  { label: "Design System", icon: FiLayers, path: "/design-system" },
  { label: "Contatos WhatsApp", icon: FiUsers, path: "/whatsapp-contatos" },
  { label: "Configurações", icon: FiSettings, path: "/settings" }
];

const UserSection = styled.div<{ $isExpanded: boolean }>`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: 1rem 0.85rem 1.1rem;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`;

const UserInfo = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.38);
  border: 1px solid ${({ theme }) => theme.colors.border};
  justify-content: ${({ $isExpanded }) => ($isExpanded ? "flex-start" : "center")};
`;

const UserAvatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 14px;
  background: linear-gradient(135deg, #38bdf8, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.95rem;
  flex-shrink: 0;
  box-shadow: 0 12px 24px rgba(56, 189, 248, 0.22);
`;

const UserDetails = styled.div<{ $isExpanded: boolean }>`
  display: ${({ $isExpanded }) => ($isExpanded ? "flex" : "none")};
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`;

const UserName = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.92rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserRole = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.76rem;
  white-space: nowrap;
`;

const LogoutButton = styled.button<{ $isExpanded: boolean }>`
  background: transparent;
  border: 1px solid rgba(248, 113, 113, 0.16);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 0.85rem;
  border-radius: 16px;
  color: #fda4af;
  width: 100%;
  transition: all 0.2s ease;
  justify-content: ${({ $isExpanded }) => ($isExpanded ? "flex-start" : "center")};

  &:hover {
    background: rgba(127, 29, 29, 0.28);
    border-color: rgba(248, 113, 113, 0.26);
    color: #fecdd3;
  }

  span {
    display: ${({ $isExpanded }) => ($isExpanded ? "block" : "none")};
    font-size: 0.9rem;
    font-weight: 600;
  }
`;

export function Sidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

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

  const handleDesktopExpand = () => {
    if (typeof window !== "undefined" && window.innerWidth > 768) {
      setIsExpanded(true);
    }
  };

  const handleDesktopCollapse = () => {
    if (typeof window !== "undefined" && window.innerWidth > 768) {
      setIsExpanded(false);
    }
  };

  const toggleSidebar = () => setIsExpanded((prev) => !prev);

  const toggleSubMenu = (label: string) => {
    if (!isExpanded) {
      setIsExpanded(true);
      setOpenSubMenus([label]);
      return;
    }

    setOpenSubMenus((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleMenuClick = (item: MenuItemType) => {
    if (item.subItems) {
      toggleSubMenu(item.label);
      return;
    }

    if (item.path) {
      router.push(item.path);
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        setIsExpanded(false);
      }
    }
  };

  return (
    <>
      <MobileOverlay $isVisible={isExpanded} onClick={() => setIsExpanded(false)} />
      <SidebarSpacer $isExpanded={isExpanded} />
      <SidebarContainer
        $isExpanded={isExpanded}
        onMouseEnter={handleDesktopExpand}
        onMouseLeave={handleDesktopCollapse}
      >
        <SidebarHeader $isExpanded={isExpanded}>
          <Brand $isExpanded={isExpanded}>
            <BrandMark>T</BrandMark>
            <BrandText $isExpanded={isExpanded}>
              <BrandTitle>TicketBR</BrandTitle>
              <BrandSubtitle>Atalhos inteligentes</BrandSubtitle>
            </BrandText>
          </Brand>
          <ToggleButton $isExpanded={isExpanded} onClick={toggleSidebar} aria-label="Alternar menu lateral">
            <FiMenu />
          </ToggleButton>
        </SidebarHeader>

        <SectionLabel $isExpanded={isExpanded}>Navegação</SectionLabel>
        <MenuList>
          {menuItems.map((item) => {
            const isActive =
              activePath === item.path ||
              item.subItems?.some((sub) => activePath === sub.path || activePath.startsWith(`${sub.path}/`)) ||
              false;
            const hasSubItems = !!item.subItems;
            const isSubMenuOpen = openSubMenus.includes(item.label);

            return (
              <MenuItemContainer key={item.label}>
                <MenuItem
                  $isActive={isActive}
                  $isExpanded={isExpanded}
                  onClick={() => handleMenuClick(item)}
                  title={!isExpanded ? item.label : ""}
                >
                  <IconWrap $isActive={isActive}>
                    <item.icon />
                  </IconWrap>
                  <MenuLabel $isExpanded={isExpanded}>{item.label}</MenuLabel>
                  {hasSubItems && (
                    <ChevronIcon $isExpanded={isExpanded}>
                      {isSubMenuOpen ? <FiChevronDown /> : <FiChevronRight />}
                    </ChevronIcon>
                  )}
                </MenuItem>

                {hasSubItems && (
                  <SubMenu $isOpen={isSubMenuOpen} $isExpanded={isExpanded}>
                    {item.subItems!.map((sub) => (
                      <SubMenuItem
                        key={sub.path}
                        href={sub.path}
                        $isActive={activePath === sub.path || activePath.startsWith(`${sub.path}/`)}
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(sub.path);
                          if (typeof window !== "undefined" && window.innerWidth <= 768) {
                            setIsExpanded(false);
                          }
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
              <UserDetails $isExpanded={isExpanded}>
                <UserName>{user.name}</UserName>
                <UserRole>{user.role}</UserRole>
              </UserDetails>
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
