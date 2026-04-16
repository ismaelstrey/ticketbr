"use client";

import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  FiHome,
  FiGrid,
  FiUsers,
  FiBookOpen,
  FiWifi,
  FiZap,
  FiSettings,
  FiChevronDown,
  FiChevronRight,
  FiMenu,
  FiLogOut,
  FiEdit,
  FiLayers,
  FiX
} from "@/components/icons";

const EXPANDED_WIDTH = "288px";
const COLLAPSED_WIDTH = "72px";

const SidebarContainer = styled.aside<{ $isExpanded: boolean }>`
  background: ${({ theme }) => theme.tokens.color.bg.sidebar};
  border-right: 1px solid ${({ theme }) => theme.tokens.color.sidebar.border};
  backdrop-filter: blur(18px);
  box-shadow: ${({ theme }) => theme.shadows.card};
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: ${({ theme }) => theme.zIndex.sidebar};
  width: ${({ $isExpanded }) => ($isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH)};
  transition: width 0.28s ease, box-shadow 0.28s ease;
  overflow-y: auto;
  overflow-x: hidden;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.hover};
  }

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.tokens.color.border.strong};
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

const HeaderIconButton = styled.button`
  width: 2rem;
  height: 2rem;
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: ${({ theme }) => theme.tokens.color.bg.surface};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.tokens.color.text.primary};
    background: ${({ theme }) => theme.tokens.color.interactive.ghostHover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.interactive.primary};
    outline-offset: 2px;
  }
`;

const Brand = styled.div<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
  opacity: ${({ $isExpanded }) => ($isExpanded ? 1 : 0.96)};
  cursor: pointer;
`;

const BrandMark = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: ${({ theme }) => theme.tokens.color.sidebar.brandGradient};
  box-shadow: ${({ theme }) => theme.shadows.card};
  color: ${({ theme }) => theme.tokens.color.text.inverse};
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
  color: ${({ theme }) => theme.tokens.color.text.primary};
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
`;

const BrandSubtitle = styled.span`
  color: ${({ theme }) => theme.tokens.color.sidebar.muted};
  font-size: 0.75rem;
  white-space: nowrap;
`;

const SectionLabel = styled.span<{ $isExpanded: boolean }>`
  display: ${({ $isExpanded }) => ($isExpanded ? "block" : "none")};
  padding: 0 1.2rem;
  margin: 0.4rem 0 0.3rem;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`;

const MenuList = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  padding: 0.35rem 0.55rem 0.85rem;
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
  padding: 0.62rem 0.72rem;
  background: ${({ $isActive, theme }) =>
    $isActive ? theme.tokens.color.interactive.ghostHover : "transparent"};
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  color: ${({ theme }) => theme.tokens.color.text.primary};
  opacity: ${({ $isActive }) => ($isActive ? 1 : 0.72)};
  transition: all ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing};
  justify-content: ${({ $isExpanded }) => ($isExpanded ? "flex-start" : "center")};
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      ${({ theme }) => `${theme.tokens.color.bg.surfaceElevated}44`},
      transparent 58%
    );
    opacity: ${({ $isActive }) => ($isActive ? 1 : 0)};
    transition: opacity 0.22s ease;
  }

  &:hover {
    background: ${({ theme }) => theme.tokens.color.interactive.ghostHover};
    opacity: 1;
    transform: translateX(1px);
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.interactive.primary};
    outline-offset: 1px;
  }

  &:hover::before {
    opacity: 1;
  }
`;

const IconWrap = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  background: transparent;
  box-shadow: none;
  transition: all 0.22s ease;
  position: relative;
  z-index: 1;

  font-size: 22px;

  & > svg {
    width: 22px;
    height: 22px;
  }
`;

const MenuLabel = styled.span<{ $isExpanded: boolean }>`
  margin-left: 0.72rem;
  font-size: 0.9rem;
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
  color: ${({ theme }) => theme.tokens.color.text.muted};
  position: relative;
  z-index: 1;
`;

const SubMenu = styled.div<{ $isOpen: boolean; $isExpanded: boolean }>`
  display: ${({ $isOpen, $isExpanded }) => ($isOpen && $isExpanded ? "flex" : "none")};
  flex-direction: column;
  padding: 0.15rem 0 0 2.6rem;
  gap: 0.15rem;
`;

const SubMenuItem = styled.a<{ $isActive: boolean }>`
  display: block;
  padding: 0.5rem 0.65rem;
  color: ${({ theme }) => theme.tokens.color.text.primary};
  opacity: ${({ $isActive }) => ($isActive ? 1 : 0.72)};
  font-size: 0.84rem;
  text-decoration: none;
  border-radius: 10px;
  background: ${({ $isActive, theme }) =>
    $isActive ? theme.tokens.color.interactive.ghostHover : "transparent"};
  border: 1px solid transparent;
  transition: all ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing};

  &:hover {
    opacity: 1;
    background: ${({ theme }) => theme.tokens.color.interactive.ghostHover};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.interactive.primary};
    outline-offset: 2px;
  }
`;

const MobileOverlay = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.tokens.color.bg.overlay};
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
  {
    label: "Dashboards",
    icon: FiHome,
    path: "/",
    subItems: [
      { label: "Operacional", path: "/" },
      { label: "Kanban", path: "/ticket/kanban" }
    ]
  },
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
  border-top: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  padding: ${({ $isExpanded }) => ($isExpanded ? "1rem 0.85rem 1.1rem" : "0.9rem 0.55rem 1.05rem")};
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
  border-radius: 10px;
  justify-content: ${({ $isExpanded }) => ($isExpanded ? "flex-start" : "center")};
`;

const UserAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 0;
  background: ${({ theme }) => theme.tokens.color.sidebar.brandGradient};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.tokens.color.text.inverse};
  font-weight: 700;
  font-size: 0.95rem;
  flex-shrink: 0;
  box-shadow: ${({ theme }) => theme.shadows.card};
`;

const UserDetails = styled.div<{ $isExpanded: boolean }>`
  display: ${({ $isExpanded }) => ($isExpanded ? "flex" : "none")};
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`;

const UserName = styled.span`
  color: ${({ theme }) => theme.tokens.color.text.primary};
  font-size: 0.92rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserRole = styled.span`
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: 0.76rem;
  white-space: nowrap;
`;

const LogoutButton = styled.button<{ $isExpanded: boolean }>`
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.8rem 0.85rem;
  border-radius: 10px;
  color: ${({ theme }) => theme.tokens.color.text.primary};
  opacity: 0.72;
  width: 100%;
  transition: all ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.easing};
  justify-content: ${({ $isExpanded }) => ($isExpanded ? "flex-start" : "center")};

  &:hover {
    background: ${({ theme }) => theme.tokens.color.interactive.ghostHover};
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.interactive.primary};
    outline-offset: 2px;
  }

  span {
    display: ${({ $isExpanded }) => ($isExpanded ? "block" : "none")};
    font-size: 0.9rem;
    font-weight: 600;
  }
`;

const MobileMenuButton = styled.button`
  position: fixed;
  top: ${({ theme }) => theme.spacing[3]};
  left: ${({ theme }) => theme.spacing[3]};
  z-index: calc(${({ theme }) => theme.zIndex.sidebar} + 1);
  width: 2.5rem;
  height: 2.5rem;
  display: none;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  background: ${({ theme }) => theme.tokens.color.bg.surfaceElevated};
  color: ${({ theme }) => theme.tokens.color.text.primary};
  box-shadow: ${({ theme }) => theme.shadows.card};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.tokens.color.interactive.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: inline-flex;
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
      <MobileMenuButton
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        aria-label={isExpanded ? "Fechar menu lateral" : "Abrir menu lateral"}
        aria-expanded={isExpanded}
        aria-controls="ticketbr-sidebar"
      >
        {isExpanded ? <FiX /> : <FiMenu />}
      </MobileMenuButton>
      <MobileOverlay $isVisible={isExpanded} onClick={() => setIsExpanded(false)} />
      <SidebarSpacer $isExpanded={isExpanded} />
      <SidebarContainer
        id="ticketbr-sidebar"
        $isExpanded={isExpanded}
        onMouseEnter={handleDesktopExpand}
        onMouseLeave={handleDesktopCollapse}
      >
        <SidebarHeader $isExpanded={isExpanded}>
          <Brand $isExpanded={isExpanded} onClick={() => router.push("/ticket/kanban")}>
            <BrandMark>T</BrandMark>
            <BrandText $isExpanded={isExpanded}>
              <BrandTitle>TicketBR</BrandTitle>
              <BrandSubtitle>Atalhos inteligentes</BrandSubtitle>
            </BrandText>
          </Brand>
          {isExpanded ? (
            <HeaderIconButton
              type="button"
              aria-label="Fechar menu lateral"
              onClick={() => setIsExpanded(false)}
            >
              <FiX />
            </HeaderIconButton>
          ) : null}
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
                  aria-expanded={hasSubItems ? isSubMenuOpen : undefined}
                  aria-haspopup={hasSubItems ? "menu" : undefined}
                  aria-controls={hasSubItems ? `submenu-${item.label}` : undefined}
                >
                  <IconWrap>
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
                  <SubMenu id={`submenu-${item.label}`} $isOpen={isSubMenuOpen} $isExpanded={isExpanded}>
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

