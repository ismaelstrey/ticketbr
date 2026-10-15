"use client";

import React, { useMemo } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiTool,
  FiLayers,
  FiZap,
  FiLock,
  FiBookOpen,
  FiGrid,
  FiUsers,
  FiWifi,
  FiSettings,
  FiHome
} from "@/components/icons";

// ============================================================
// Tipos
// ============================================================
type ModuleStatus = "done" | "in-progress" | "pending";

interface Module {
  name: string;
  description: string;
  status: ModuleStatus;
  progress: number;
  icon: React.ElementType;
  features: string[];
}

interface QualityMetric {
  label: string;
  value: string;
  status: "ok" | "warning" | "danger";
  description: string;
}

interface RoadmapItem {
  phase: string;
  title: string;
  description: string;
  priority: "P0" | "P1" | "P2";
  status: ModuleStatus;
}

interface TechDebtItem {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
}

// ============================================================
// Estilos
// ============================================================
const Container = styled.div`
  padding: ${({ theme }) => theme.spacing[8]};
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[8]};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ theme }) => theme.spacing[4]};
    gap: ${({ theme }) => theme.spacing[6]};
  }
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Title = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size["2xl"]};
  font-weight: ${({ theme }) => theme.typography.weight.extrabold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  font-size: ${({ theme }) => theme.typography.size.md};
`;

const VersionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  background: ${({ theme }) => theme.tokens.color.status.infoSurface};
  color: ${({ theme }) => theme.tokens.color.status.infoText};
  border: 1px solid ${({ theme }) => theme.tokens.color.status.infoBorder};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
`;

// --- Progresso Geral ---
const OverallSection = styled.section`
  display: grid;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ProgressCard = styled(Card)`
  padding: ${({ theme }) => theme.spacing[6]};
`;

const ProgressHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ProgressTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const ProgressPercent = styled.span<{ $percent: number }>`
  font-size: 2.5rem;
  font-weight: ${({ theme }) => theme.typography.weight.extrabold};
  background: ${({ $percent }) =>
    $percent >= 70
      ? "linear-gradient(135deg, #16a34a, #0ea5e9)"
      : $percent >= 40
        ? "linear-gradient(135deg, #f59e0b, #ef4444)"
        : "linear-gradient(135deg, #ef4444, #7c3aed)"};
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 14px;
  background: ${({ theme }) => theme.tokens.color.bg.surfaceAlt};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
`;

const ProgressBarFill = styled(motion.div)<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: ${({ $percent }) =>
    $percent >= 70
      ? "linear-gradient(90deg, #16a34a, #0ea5e9)"
      : $percent >= 40
        ? "linear-gradient(90deg, #f59e0b, #ef4444)"
        : "linear-gradient(90deg, #ef4444, #7c3aed)"};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.tokens.color.bg.surfaceAlt};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
`;

const StatValue = styled.span`
  font-size: 1.5rem;
  font-weight: ${({ theme }) => theme.typography.weight.extrabold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const StatLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

// --- Módulos ---
const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ModulesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ModuleCard = styled(motion.div)`
  background: ${({ theme }) => theme.tokens.color.bg.surface};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  padding: ${({ theme }) => theme.spacing[5]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  box-shadow: ${({ theme }) => theme.shadows.card};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.hover};
  }
`;

const ModuleHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ModuleIconWrap = styled.div<{ $status: ModuleStatus }>`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  background: ${({ theme, $status }) =>
    $status === "done"
      ? theme.tokens.color.status.successSurface
      : $status === "in-progress"
        ? theme.tokens.color.status.infoSurface
        : theme.tokens.color.bg.surfaceAlt};
  color: ${({ theme, $status }) =>
    $status === "done"
      ? theme.tokens.color.status.success
      : $status === "in-progress"
        ? theme.tokens.color.status.info
        : theme.tokens.color.text.muted};
`;

const ModuleName = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.lg};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const ModuleDesc = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  line-height: 1.5;
`;

const ModuleProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const MiniProgressTrack = styled.div`
  flex: 1;
  height: 6px;
  background: ${({ theme }) => theme.tokens.color.bg.surfaceAlt};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
  overflow: hidden;
`;

const MiniProgressFill = styled.div<{ $percent: number; $status: ModuleStatus }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: ${({ theme, $status }) =>
    $status === "done"
      ? theme.tokens.color.status.success
      : $status === "in-progress"
        ? theme.tokens.color.status.info
        : theme.tokens.color.text.muted};
  border-radius: ${({ theme }) => theme.borderRadius.pill};
`;

const ProgressText = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  min-width: 38px;
  text-align: right;
`;

const FeatureList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const FeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

// --- Qualidade Técnica ---
const QualityGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const QualityCard = styled(Card)<{ $status: "ok" | "warning" | "danger" }>`
  padding: ${({ theme }) => theme.spacing[5]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  border-left: 4px solid
    ${({ theme, $status }) =>
      $status === "ok"
        ? theme.tokens.color.status.success
        : $status === "warning"
          ? theme.tokens.color.status.warning
          : theme.tokens.color.status.warning};
`;

const QualityLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.tokens.color.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
`;

const QualityValue = styled.span`
  font-size: 1.75rem;
  font-weight: ${({ theme }) => theme.typography.weight.extrabold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const QualityDesc = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

// --- Stack Tecnológica ---
const StackGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
`;

const StackItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.tokens.color.bg.surface};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
`;

const StackIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  display: grid;
  place-items: center;
  color: white;
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  font-size: 0.85rem;
  flex-shrink: 0;
`;

const StackInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const StackName = styled.span`
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
  font-size: ${({ theme }) => theme.typography.size.md};
`;

const StackVersion = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.tokens.color.text.muted};
`;

// --- Roadmap ---
const RoadmapList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const RoadmapRow = styled(motion.div)`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: ${({ theme }) => theme.spacing[4]};
  align-items: center;
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.tokens.color.bg.surface};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.medium};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing[2]};
  }
`;

const PhaseBadge = styled.span`
  font-size: ${({ theme }) => theme.typography.size.xs};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.3rem 0.6rem;
  background: ${({ theme }) => theme.tokens.color.bg.surfaceAlt};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  white-space: nowrap;
`;

const RoadmapContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RoadmapTitle = styled.span`
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const RoadmapDesc = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

// --- Dívida Técnica ---
const DebtList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const DebtItem = styled.div<{ $impact: "high" | "medium" | "low" }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.tokens.color.bg.surface};
  border: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  border-left: 4px solid
    ${({ theme, $impact }) =>
      $impact === "high"
        ? theme.tokens.color.status.warning
        : $impact === "medium"
          ? theme.tokens.color.status.info
          : theme.tokens.color.text.muted};
`;

const DebtContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DebtTitle = styled.span`
  font-weight: ${({ theme }) => theme.typography.weight.semibold};
  color: ${({ theme }) => theme.tokens.color.text.primary};
`;

const DebtDesc = styled.span`
  font-size: ${({ theme }) => theme.typography.size.sm};
  color: ${({ theme }) => theme.tokens.color.text.secondary};
`;

// --- Footer ---
const Footer = styled.footer`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.tokens.color.border.default};
  text-align: center;
`;

const FooterText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.tokens.color.text.muted};
  font-size: ${({ theme }) => theme.typography.size.sm};
`;

// ============================================================
// Dados do Projeto
// ============================================================

// Módulos implementados e seu status
const modules: Module[] = [
  {
    name: "Autenticação & Sessão",
    description: "Login com JWT em cookie HTTP-only, contexto de auth e proteção de rotas.",
    status: "done",
    progress: 100,
    icon: FiLock,
    features: [
      "Login /api/auth/login",
      "Sessão com JWT + bcrypt",
      "Contexto AuthContext",
      "Middleware de autenticação"
    ]
  },
  {
    name: "Dashboard Operacional",
    description: "Painel com KPIs, gráficos e visão geral dos tickets.",
    status: "done",
    progress: 100,
    icon: FiHome,
    features: [
      "KPIs de tickets",
      "Gráficos (Recharts)",
      "Filtros e exportação",
      "API /api/dashboard/tickets"
    ]
  },
  {
    name: "Kanban de Tickets",
    description: "Quadro Kanban com drag-and-drop e gestão de tickets.",
    status: "done",
    progress: 95,
    icon: FiGrid,
    features: [
      "Drag-and-drop entre colunas",
      "CRUD de tickets",
      "Status: TODO, DOING, PAUSED, DONE",
      "SLA e pausas"
    ]
  },
  {
    name: "Módulo de Tarefas",
    description: "Criação e organização de tarefas vinculadas a tickets.",
    status: "done",
    progress: 90,
    icon: FiCheckCircle,
    features: [
      "Kanban e Lista de tarefas",
      "Subtarefas e anexos",
      "Vínculo com tickets",
      "API completa /api/tasks"
    ]
  },
  {
    name: "Módulo de Projetos",
    description: "Gestão de projetos com membros, status e relatórios.",
    status: "done",
    progress: 85,
    icon: FiBookOpen,
    features: [
      "CRUD de projetos",
      "Membros e permissões",
      "Dashboard e relatórios",
      "Exportação de projetos"
    ]
  },
  {
    name: "Chat / WhatsApp",
    description: "Integração com WhatsApp via Evolution API e Uazapi.",
    status: "in-progress",
    progress: 75,
    icon: FiWifi,
    features: [
      "Conversas e mensagens",
      "Contatos WhatsApp",
      "Webhook de entrada",
      "Fallback para Portal"
    ]
  },
  {
    name: "Área do Cliente (Portal)",
    description: "Portal do cliente para abertura e acompanhamento de tickets.",
    status: "done",
    progress: 80,
    icon: FiUsers,
    features: [
      "Login do cliente",
      "Abertura de tickets",
      "Comentários e chat",
      "Dashboard do cliente"
    ]
  },
  {
    name: "Cadastros",
    description: "Gestão de solicitantes, operadores e usuários com RBAC ADMIN/staff.",
    status: "done",
    progress: 100,
    icon: FiTool,
    features: [
      "Solicitantes (CRUD)",
      "Operadores (CRUD)",
      "Usuários (CRUD)",
      "Autorização por perfil (RBAC)"
    ]
  },
  {
    name: "Configurações",
    description: "Integrações, armazenamento, WhatsApp e webhooks.",
    status: "in-progress",
    progress: 70,
    icon: FiSettings,
    features: [
      "Integração Evolution/N8N",
      "Storage S3",
      "Configuração WhatsApp",
      "Logs de webhook"
    ]
  },
  {
    name: "Design System",
    description: "Componentes base, tokens e padrões visuais.",
    status: "done",
    progress: 100,
    icon: FiLayers,
    features: [
      "Tokens de cor e espaçamento",
      "Componentes UI base",
      "Tema dark/light",
      "Página de referência"
    ]
  }
];

// Métricas de qualidade
const qualityMetrics: QualityMetric[] = [
  {
    label: "Testes Automatizados",
    value: "81 arquivos",
    status: "ok",
    description: "211 testes passando, incluindo testes de contrato, unitários, integração, autorização e regras de status/SLA."
  },
  {
    label: "Lint (ESLint)",
    value: "Passando",
    status: "ok",
    description: "ESLint configurado com regras do Next.js, sem erros."
  },
  {
    label: "Typecheck",
    value: "Passando",
    status: "ok",
    description: "TypeScript 5.9 sem erros de tipo."
  },
  {
    label: "CI/CD Pipeline",
    value: "Configurado",
    status: "ok",
    description: "GitHub Actions com lint, typecheck, testes, contrato e build."
  },
  {
    label: "Cobertura de Testes",
    value: "Parcial",
    status: "warning",
    description: "Cobertura significativa em serviços e APIs, mas sem métrica oficial de %."
  },
  {
    label: "Segurança (npm audit)",
    value: "0 vulnerabilidades",
    status: "ok",
    description: "Nenhuma vulnerabilidade conhecida nas dependências."
  },
  {
    label: "Autorização (RBAC)",
    value: "Rotas protegidas",
    status: "ok",
    description: "Rotas administrativas exigem perfil ADMIN; rotas de staff exigem sessão válida (401/403)."
  }
];

// Stack tecnológica
const techStack = [
  { name: "Next.js", version: "16.4.1", abbr: "Nx" },
  { name: "React", version: "19.2.4", abbr: "Re" },
  { name: "TypeScript", version: "5.9.3", abbr: "TS" },
  { name: "Prisma", version: "7.7.0", abbr: "Pr" },
  { name: "PostgreSQL", version: "—", abbr: "PG" },
  { name: "Tailwind", version: "v4", abbr: "TW" },
  { name: "Framer Motion", version: "12.34", abbr: "FM" },
  { name: "styled-components", version: "6.3.9", abbr: "SC" },
  { name: "Vitest", version: "4.0.18", abbr: "Vt" },
  { name: "Zod", version: "4.3.6", abbr: "Zd" },
  { name: "Recharts", version: "3.2.0", abbr: "Rc" },
  { name: "Vercel", version: "Deploy", abbr: "Vc" }
];

// Roadmap para conclusão
const roadmap: RoadmapItem[] = [
  {
    phase: "Fase 1 — Estabilização",
    title: "Hardening de RBAC e autorização por rota",
    description: "Controle de acesso por perfil (ADMIN, AGENT, CUSTOMER) aplicado nas rotas administrativas e de cadastro.",
    priority: "P0",
    status: "done"
  },
  {
    phase: "Fase 1 — Estabilização",
    title: "Health checks de dependências",
    description: "Endpoint /api/health com status do banco, latência, versão, uptime e variáveis de ambiente.",
    priority: "P0",
    status: "done"
  },
  {
    phase: "Fase 2 — Consolidação",
    title: "Remover campos legados do Ticket",
    description: "Etapa 1 concluída: backfill dos relacionamentos (tipo, categoria, mesa, operador), leitura usando as relações como fonte de verdade e escrita resolvendo os IDs. Falta remover o dual-write e dropar as colunas.",
    priority: "P1",
    status: "in-progress"
  },
  {
    phase: "Fase 2 — Consolidação",
    title: "Regras de transição de status e SLA",
    description: "Máquina de estados de status (TODO/DOING/PAUSED/DONE) e política de SLA (tipo de ticket, contrato e padrão) centralizadas em camada de serviço, com testes.",
    priority: "P1",
    status: "done"
  },
  {
    phase: "Fase 2 — Consolidação",
    title: "Observabilidade estruturada",
    description: "Logs estruturados, métricas e tracing para diagnóstico operacional.",
    priority: "P1",
    status: "pending"
  },
  {
    phase: "Fase 3 — Escala",
    title: "Notificações (email/in-app)",
    description: "Sistema de notificações para eventos de ticket, SLA e atribuições.",
    priority: "P2",
    status: "pending"
  },
  {
    phase: "Fase 3 — Escala",
    title: "Relatórios e dashboards gerenciais",
    description: "KPIs persistidos, relatórios exportáveis e painéis de gestão.",
    priority: "P2",
    status: "in-progress"
  },
  {
    phase: "Fase 3 — Escala",
    title: "Documentação operacional completa",
    description: "Arquitetura, runbook de incidentes, política de backup/restore e guia de deploy.",
    priority: "P2",
    status: "pending"
  }
];

// Dívida técnica identificada
const techDebt: TechDebtItem[] = [
  {
    title: "RBAC em rotas de chat",
    description: "Rotas administrativas e de cadastro já estão protegidas; revisar autorização fina das rotas de chat/integração.",
    impact: "low"
  },
  {
    title: "Campos legados no Ticket",
    description: "Relacionamentos já são a fonte de verdade na leitura e o backfill foi aplicado; resta remover o dual-write e dropar as colunas string.",
    impact: "medium"
  },
  {
    title: "Rate-limit e bloqueio de login",
    description: "Falta política de rate-limit em tentativas de login e bloqueio progressivo.",
    impact: "medium"
  },
  {
    title: "Observabilidade",
    description: "Health check já cobre dependências; falta stack de logs estruturados/métricas.",
    impact: "medium"
  },
  {
    title: "Cobertura de testes",
    description: "Há 81 arquivos de teste, mas sem métrica oficial de cobertura percentual.",
    impact: "low"
  },
  {
    title: "Documentação operacional",
    description: "Falta runbook de incidentes, política de backup/restore e guia de ambiente.",
    impact: "low"
  }
];

// ============================================================
// Componente Principal
// ============================================================

export default function ProgressoPage() {
  // Calcula o progresso geral baseado na média dos módulos
  const overallProgress = useMemo(() => {
    const total = modules.reduce((acc, m) => acc + m.progress, 0);
    return Math.round(total / modules.length);
  }, []);

  const doneCount = modules.filter((m) => m.status === "done").length;
  const inProgressCount = modules.filter((m) => m.status === "in-progress").length;
  const pendingCount = modules.filter((m) => m.status === "pending").length;

  const statusLabel = (status: ModuleStatus) => {
    if (status === "done") return "Concluído";
    if (status === "in-progress") return "Em andamento";
    return "Pendente";
  };

  const statusTone = (status: ModuleStatus): "success" | "info" | "warning" => {
    if (status === "done") return "success";
    if (status === "in-progress") return "info";
    return "warning";
  };

  return (
    <AppLayout>
      <Container>
        {/* Cabeçalho */}
        <Header>
          <HeaderRow>
            <Title>
              <FiLayers />
              Progresso do Projeto
            </Title>
            <VersionBadge>v0.1.0 — TicketBR</VersionBadge>
          </HeaderRow>
          <Subtitle>
            Acompanhamento do andamento do TicketBR até a conclusão. Visão consolidada dos módulos,
            qualidade técnica, roadmap e dívidas técnicas.
          </Subtitle>
        </Header>

        {/* Progresso Geral */}
        <OverallSection>
          <ProgressCard>
            <ProgressHeader>
              <ProgressTitle>Progresso Geral</ProgressTitle>
              <ProgressPercent $percent={overallProgress}>{overallProgress}%</ProgressPercent>
            </ProgressHeader>
            <ProgressBarTrack>
              <ProgressBarFill
                $percent={overallProgress}
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </ProgressBarTrack>
            <StatsGrid>
              <StatItem>
                <StatValue>{modules.length}</StatValue>
                <StatLabel>Módulos totais</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{doneCount}</StatValue>
                <StatLabel>Concluídos</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{inProgressCount}</StatValue>
                <StatLabel>Em andamento</StatLabel>
              </StatItem>
              <StatItem>
                <StatValue>{pendingCount}</StatValue>
                <StatLabel>Pendentes</StatLabel>
              </StatItem>
            </StatsGrid>
          </ProgressCard>
        </OverallSection>

        {/* Módulos */}
        <Section>
          <SectionTitle>
            <FiGrid /> Módulos do Sistema
          </SectionTitle>
          <ModulesGrid>
            {modules.map((mod) => (
              <ModuleCard
                key={mod.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ModuleHeader>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <ModuleIconWrap $status={mod.status}>
                      <mod.icon />
                    </ModuleIconWrap>
                    <div>
                      <ModuleName>{mod.name}</ModuleName>
                    </div>
                  </div>
                  <Badge tone={statusTone(mod.status)}>{statusLabel(mod.status)}</Badge>
                </ModuleHeader>
                <ModuleDesc>{mod.description}</ModuleDesc>
                <ModuleProgressRow>
                  <MiniProgressTrack>
                    <MiniProgressFill $percent={mod.progress} $status={mod.status} />
                  </MiniProgressTrack>
                  <ProgressText>{mod.progress}%</ProgressText>
                </ModuleProgressRow>
                <FeatureList>
                  {mod.features.map((feat) => (
                    <FeatureItem key={feat}>
                      <FiCheckCircle style={{ color: "var(--status-success)", flexShrink: 0 }} />
                      {feat}
                    </FeatureItem>
                  ))}
                </FeatureList>
              </ModuleCard>
            ))}
          </ModulesGrid>
        </Section>

        {/* Qualidade Técnica */}
        <Section>
          <SectionTitle>
            <FiZap /> Qualidade Técnica
          </SectionTitle>
          <QualityGrid>
            {qualityMetrics.map((metric) => (
              <QualityCard key={metric.label} $status={metric.status}>
                <QualityLabel>{metric.label}</QualityLabel>
                <QualityValue>{metric.value}</QualityValue>
                <QualityDesc>{metric.description}</QualityDesc>
              </QualityCard>
            ))}
          </QualityGrid>
        </Section>

        {/* Stack Tecnológica */}
        <Section>
          <SectionTitle>
            <FiLayers /> Stack Tecnológica
          </SectionTitle>
          <StackGrid>
            {techStack.map((tech) => (
              <StackItem key={tech.name}>
                <StackIcon>{tech.abbr}</StackIcon>
                <StackInfo>
                  <StackName>{tech.name}</StackName>
                  <StackVersion>{tech.version}</StackVersion>
                </StackInfo>
              </StackItem>
            ))}
          </StackGrid>
        </Section>

        {/* Roadmap para Conclusão */}
        <Section>
          <SectionTitle>
            <FiClock /> Roadmap para Conclusão
          </SectionTitle>
          <RoadmapList>
            {roadmap.map((item, idx) => (
              <RoadmapRow
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <PhaseBadge>{item.phase}</PhaseBadge>
                <RoadmapContent>
                  <RoadmapTitle>{item.title}</RoadmapTitle>
                  <RoadmapDesc>{item.description}</RoadmapDesc>
                </RoadmapContent>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <Badge tone={item.priority === "P0" ? "warning" : item.priority === "P1" ? "info" : undefined}>
                    {item.priority}
                  </Badge>
                  <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                </div>
              </RoadmapRow>
            ))}
          </RoadmapList>
        </Section>

        {/* Dívida Técnica */}
        <Section>
          <SectionTitle>
            <FiAlertCircle /> Dívida Técnica Identificada
          </SectionTitle>
          <DebtList>
            {techDebt.map((debt) => (
              <DebtItem key={debt.title} $impact={debt.impact}>
                <FiAlertCircle
                  style={{
                    color:
                      debt.impact === "high"
                        ? "var(--status-warning)"
                        : debt.impact === "medium"
                          ? "var(--status-info)"
                          : "var(--text-muted)",
                    flexShrink: 0,
                    marginTop: 2
                  }}
                />
                <DebtContent>
                  <DebtTitle>{debt.title}</DebtTitle>
                  <DebtDesc>{debt.description}</DebtDesc>
                </DebtContent>
                <Badge tone={debt.impact === "high" ? "warning" : debt.impact === "medium" ? "info" : undefined}>
                  {debt.impact === "high" ? "Alto" : debt.impact === "medium" ? "Médio" : "Baixo"}
                </Badge>
              </DebtItem>
            ))}
          </DebtList>
        </Section>

        {/* Rodapé */}
        <Footer>
          <FooterText>
            Última atualização: {new Date().toLocaleDateString("pt-BR")} • TicketBR — Sistema de Ordem de Serviço
          </FooterText>
          <FooterText>
            Esta página reflete o estado atual do projeto e serve como guia para a conclusão.
          </FooterText>
        </Footer>
      </Container>
    </AppLayout>
  );
}
