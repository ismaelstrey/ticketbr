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
  FiHome,
  FiServer
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
    progress: 100,
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
    progress: 100,
    icon: FiCheckCircle,
    features: [
      "Kanban e Lista de tarefas",
      "Subtarefas e anexos",
      "Comentários com autoria",
      "Vínculo com tickets",
      "API completa /api/tasks"
    ]
  },
  {
    name: "Módulo de Projetos",
    description: "Gestão de projetos com membros, status e relatórios.",
    status: "done",
    progress: 100,
    icon: FiBookOpen,
    features: [
      "CRUD de projetos",
      "Membros e permissões",
      "Dashboard e relatórios",
      "Exportação de projetos"
    ]
  },
  {
    name: "Inventário & Cofre de Senhas",
    description: "Cadastro de equipamentos de TI (switch, roteador, VM, impressora) com cofre de credenciais cifradas e ACL por usuário, grupo ou papel.",
    status: "done",
    progress: 100,
    icon: FiServer,
    features: [
      "Equipamentos com IP, hostname, MAC, série e função",
      "Credenciais cifradas (AES-256-GCM) com máscara",
      "Revelação de senha sob demanda com auditoria",
      "Política de acesso: responsável, staff ou personalizada",
      "Concessões para usuário, grupo ou papel (agente)",
      "Grupos de usuários para a ACL"
    ]
  },
  {
    name: "Chat / WhatsApp",
    description: "Integração com WhatsApp via Evolution API e Uazapi.",
    status: "done",
    progress: 100,
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
    progress: 100,
    icon: FiUsers,
    features: [
      "Login do cliente",
      "Abertura de tickets",
      "Comentários e chat",
      "Dashboard do cliente",
      "Recuperação de senha por e-mail",
      "Meus dados (perfil e senha)"
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
    description: "Integrações, armazenamento, WhatsApp, webhooks e notificações.",
    status: "done",
    progress: 100,
    icon: FiSettings,
    features: [
      "Integração Evolution/N8N",
      "Storage S3",
      "Configuração WhatsApp",
      "Logs de webhook",
      "Preferências de notificação"
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
    value: "116 arquivos",
    status: "ok",
    description: "417 testes passando, incluindo testes de contrato, unitários, integração, autorização, regras de status/SLA, observabilidade, notificações, preferências de notificação, relatórios gerenciais, bloqueio progressivo de login, logs de webhook, autorização fina das rotas de chat, membros de projeto, lookups de tickets, comentários de tarefa, recuperação de senha do portal, cofre de senhas do inventário, ACL de credenciais (usuário/grupo/papel), sessão/JWT, guardas de autorização de staff e admin, rate-limit de rotas sensíveis, serviço de chat, tema visual e validadores de ticket."
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
    description: "GitHub Actions com lint, typecheck, testes com cobertura, contrato e build."
  },
  {
    label: "Cobertura de Testes",
    value: "29,41% linhas",
    status: "warning",
    description: "Métrica publicada pelo CI (Vitest/V8): statements 28,39%, branches 25,80%, functions 23,78%, lines 29,41%. A variação frente à medição anterior (30,59%) reflete o volume de código do módulo de Inventário ainda sem testes. Relatório lcov anexado como artefato do pipeline."
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
    description: "Concluído: backfill dos relacionamentos (tipo, categoria, mesa, operador), leitura/escrita usando as relações como fonte de verdade, dual-write removido e colunas legadas (company, requester, operator, operatorId, ticketType, category, workbench) dropadas via migration.",
    priority: "P1",
    status: "done"
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
    description: "Concluído: requestId + latência + logs estruturados nas rotas de negócio, eventos críticos persistidos no AuditLog e endpoint /api/observability/metrics com latência p95, taxa de erro e volume por rota (janela configurável).",
    priority: "P1",
    status: "done"
  },
  {
    phase: "Fase 3 — Escala",
    title: "Notificações (email/in-app)",
    description: "Concluído: modelo Notification + API /api/notifications e sino in-app no layout, com disparos em mudança de status, novo comentário, atribuição de operador e varredura de SLA (próximo/estourado) via /api/cron/sla-scan, além do envio de email.",
    priority: "P2",
    status: "done"
  },
  {
    phase: "Fase 3 — Escala",
    title: "Relatórios e dashboards gerenciais",
    description: "Concluído: snapshots diários de KPIs (modelo KpiSnapshot + cron /api/cron/kpi-snapshot), painel gerencial em /reports com KPIs do período e comparação com o período anterior, série de tendência e exportação em XLSX/PDF/JSON via /api/reports/management/export.",
    priority: "P2",
    status: "done"
  },
  {
    phase: "Fase 3 — Escala",
    title: "Documentação operacional completa",
    description: "Concluído: guia de deploy, política de backup/restore e runbook de incidentes em docs/operacional/, indexados no README.",
    priority: "P2",
    status: "done"
  },
  {
    phase: "Fase 4 — Maturidade",
    title: "Rate-limit e bloqueio progressivo de login",
    description: "Concluído: limite por conta (e-mail) com bloqueio progressivo (1/5/15/60 min) das tentativas de login (staff e cliente), somado ao limite por IP existente. Configurável por LOGIN_MAX_FAILURES, LOGIN_FAILURE_WINDOW_MINUTES e LOGIN_LOCK_STEPS_MINUTES.",
    priority: "P1",
    status: "done"
  },
  {
    phase: "Fase 4 — Maturidade",
    title: "Persistir logs de webhook no banco",
    description: "Concluído: logs de webhook passaram de memória (perdidos a cada deploy) para o modelo Prisma WebhookRequestLog, com listagem paginada, filtros (rota, fonte, status, período), limpeza e retenção configurável (WEBHOOK_LOG_MAX_ENTRIES).",
    priority: "P2",
    status: "done"
  },
  {
    phase: "Fase 4 — Maturidade",
    title: "Preferências de notificação",
    description: "Concluído: aba de Notificações em Configurações com chave geral por canal (in-app e e-mail) e por evento (status, comentário, atribuição, SLA próximo e estourado), persistidas em app_runtime_settings e respeitadas pelo dispatchNotification.",
    priority: "P2",
    status: "done"
  },
  {
    phase: "Fase 4 — Maturidade",
    title: "Autorização fina nas rotas de chat",
    description: "Concluído: rotas internas de chat (contatos, tickets, mensagens, conversas, vínculos, atendentes e preferências) passaram a exigir sessão de staff (ADMIN/AGENT) validada em banco via guardStaff. A listagem de atendentes ficou restrita a papéis de staff (sem expor contas de clientes) e a transferência de atendimento só aceita destinos de staff. Webhooks de integração (inbound/webhook/status/presence/media-ready) seguem públicos por serem chamados por sistemas externos.",
    priority: "P2",
    status: "done"
  },
  {
    phase: "Fase 4 — Maturidade",
    title: "Cobertura de testes no CI",
    description: "Concluído: o pipeline passou a executar a suíte com cobertura (Vitest/V8), publicando o resumo no step summary do GitHub Actions e anexando o relatório lcov como artefato. Métrica base: statements 29,47%, branches 26,51%, functions 25,34%, lines 30,59%.",
    priority: "P2",
    status: "done"
  },
  {
    phase: "Fase 4 — Maturidade",
    title: "Fechamento de lacunas funcionais",
    description: "Concluído: gestão de membros de projeto (API + UI + testes), substituição dos campos de texto livre de ticket por seleções baseadas em IDs (tipos, categorias, mesas e operadores via /api/tickets/lookups), comentários de tarefa com autoria e exclusão controlada, e recuperação de senha por e-mail + edição de perfil (Meus dados) no portal do cliente.",
    priority: "P1",
    status: "done"
  },
  {
    phase: "Fase 4 — Maturidade",
    title: "Inventário de equipamentos e cofre de senhas",
    description: "Concluído (fora do planejamento original): módulo /inventory para cadastro de equipamentos de TI (switch, roteador, VM, computador, impressora) com IP, hostname, MAC, série e função, e cofre de credenciais cifradas em AES-256-GCM (VAULT_ENCRYPTION_KEY). A revelação da senha é sob demanda e auditada, e a ACL de cada credencial aceita concessões por usuário, grupo ou papel (agente), além das políticas de acesso responsável/staff/personalizada. Inclui grupos de usuários para a ACL.",
    priority: "P1",
    status: "done"
  }
];

// Dívida técnica identificada
const techDebt: TechDebtItem[] = [];

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
            {techDebt.length === 0 ? (
              <DebtContent>
                <DebtTitle>Nenhuma dívida técnica pendente</DebtTitle>
                <DebtDesc>Todos os itens identificados foram resolvidos. Novos itens entram no roadmap acima.</DebtDesc>
              </DebtContent>
            ) : (
              techDebt.map((debt) => (
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
              ))
            )}
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
