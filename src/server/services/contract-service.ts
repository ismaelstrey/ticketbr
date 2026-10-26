import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/prisma";
import type {
  ContractStatus,
  ServiceBlockReason,
  SlaTermScope,
  TicketPriority
} from "../../../prisma/generated/enums";
import {
  resolveSla,
  type SlaContratoRef,
  type SlaContratoTermo,
  type SlaResolution,
  type SlaTicketRef
} from "./sla-resolver";
import type { ContractComplianceItem, ContractComplianceReport } from "@/types/managementReport";

/**
 * Serviço de contratos: CRUD, vínculo ao solicitante, ciclo de vida
 * (ativar/suspender/cancelar/renovar/expirar) e sincronização do bloqueio
 * de serviço do solicitante.
 *
 * Invariantes garantidas aqui:
 * - No máximo 1 contrato vigente (`ACTIVE`) por empresa.
 * - Janelas de vigência de um mesmo solicitante não podem se sobrepor.
 * - Toda mudança de estado que afeta o serviço recalcula o bloqueio na mesma transação.
 */

type Db = Prisma.TransactionClient;

/** Erro de negócio do módulo de contratos (carrega o status HTTP sugerido). */
export class ContratoError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ContratoError";
    this.status = status;
  }
}

export interface ContratoTermoInput {
  escopo: SlaTermScope;
  tipoTicketId?: string | null;
  categoriaId?: string | null;
  prioridade?: TicketPriority | null;
  slaRespostaHoras?: number | null;
  slaSolucaoHoras: number;
  ativo?: boolean;
}

export interface CreateContratoInput {
  numero: string;
  titulo: string;
  descricao?: string | null;
  solicitanteId?: string | null;
  slaPolicyId?: string | null;
  slaRespostaHoras?: number | null;
  slaSolucaoHoras?: number | null;
  inicioVigencia: Date;
  fimVigencia?: Date | null;
  renovacaoAutomatica?: boolean;
  diasAvisoVencimento?: number[];
  valorMensal?: number | string | null;
  penalidadeDescricao?: string | null;
  documentoUrl?: string | null;
  observacoes?: string | null;
  termos?: ContratoTermoInput[];
}

export type UpdateContratoInput = Partial<CreateContratoInput>;

export interface RenovarContratoInput {
  numero?: string;
  inicioVigencia?: Date;
  fimVigencia?: Date | null;
  valorMensal?: number | string | null;
  observacoes?: string | null;
  status?: ContractStatus;
}

export interface ContratoActor {
  id?: string | null;
}

export interface ListContratosFilters {
  q?: string;
  status?: ContractStatus;
  solicitanteId?: string;
  vigenteEm?: Date;
  vencendoAte?: Date;
  page?: number;
  pageSize?: number;
}

const contratoInclude = {
  solicitante: {
    select: {
      id: true,
      nome_fantasia: true,
      razao_social: true,
      status: true,
      servico_bloqueado: true,
      servico_bloqueado_motivo: true
    }
  },
  slaPolicy: { select: { id: true, nome: true, slaSolucaoHoras: true, slaRespostaHoras: true } },
  termos: { orderBy: { created_at: "asc" } }
} satisfies Prisma.ContratoInclude;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Converte um termo persistido no formato consumido pelo `sla-resolver`. */
function toSlaTermo(termo: {
  escopo: SlaTermScope;
  tipoTicketId: string | null;
  categoriaId: string | null;
  prioridade: TicketPriority | null;
  slaSolucaoHoras: number;
  ativo: boolean;
}): SlaContratoTermo {
  return {
    escopo: termo.escopo,
    tipoTicketId: termo.tipoTicketId,
    categoriaId: termo.categoriaId,
    prioridade: termo.prioridade,
    slaSolucaoHoras: termo.slaSolucaoHoras,
    ativo: termo.ativo
  };
}

/** Valida o alvo do termo conforme o escopo informado. */
function assertTermoValido(input: ContratoTermoInput): void {
  if (!Number.isFinite(input.slaSolucaoHoras) || input.slaSolucaoHoras <= 0) {
    throw new ContratoError("Informe as horas de solução do termo (maior que zero).");
  }

  if (input.escopo === "TIPO_TICKET" && !input.tipoTicketId) {
    throw new ContratoError("Selecione o tipo de ticket do termo de SLA.");
  }
  if (input.escopo === "CATEGORIA" && !input.categoriaId) {
    throw new ContratoError("Selecione a categoria do termo de SLA.");
  }
  if (input.escopo === "PRIORIDADE" && !input.prioridade) {
    throw new ContratoError("Selecione a prioridade do termo de SLA.");
  }
}

/** Normaliza o termo para persistência (limpa os alvos que não pertencem ao escopo). */
function mapTermoInput(input: ContratoTermoInput) {
  return {
    escopo: input.escopo,
    tipoTicketId: input.escopo === "TIPO_TICKET" ? (input.tipoTicketId ?? null) : null,
    categoriaId: input.escopo === "CATEGORIA" ? (input.categoriaId ?? null) : null,
    prioridade: input.escopo === "PRIORIDADE" ? (input.prioridade ?? null) : null,
    slaRespostaHoras: input.slaRespostaHoras ?? null,
    slaSolucaoHoras: input.slaSolucaoHoras,
    ativo: input.ativo ?? true
  };
}

interface AuditInput {
  solicitanteId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Registra a trilha de auditoria do contrato reusando a tabela AuditLog. */
async function writeAudit(db: Db, input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      solicitanteId: input.solicitanteId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entity: "contrato",
      entityId: input.entityId ?? null,
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
    }
  });
}

/** Filtro de contrato vigente: ACTIVE dentro da janela de vigência. */
function vigenteWhere(now: Date) {
  return {
    status: "ACTIVE" as ContractStatus,
    deleted_at: null,
    inicioVigencia: { lte: now },
    OR: [{ fimVigencia: null }, { fimVigencia: { gt: now } }]
  };
}

/**
 * Recalcula o bloqueio de serviço do solicitante.
 * Serviço ativo ⇔ existe contrato `ACTIVE` dentro da vigência.
 * Idempotente: pode ser chamado quantas vezes for necessário.
 */
export async function syncServiceStatus(
  solicitanteId: string,
  db: Db = prisma,
  actorUserId?: string | null
): Promise<{ bloqueado: boolean; contratoId: string | null; motivo: ServiceBlockReason | null }> {
  const now = new Date();

  const vigente = await db.contrato.findFirst({
    where: { solicitante_id: solicitanteId, ...vigenteWhere(now) },
    orderBy: { inicioVigencia: "desc" },
    select: { id: true }
  });

  if (vigente) {
    await db.solicitante.update({
      where: { id: solicitanteId },
      data: {
        contratoVigenteId: vigente.id,
        servico_bloqueado: false,
        servico_bloqueado_em: null,
        servico_bloqueado_motivo: null,
        updated_by: actorUserId ?? null
      }
    });
    return { bloqueado: false, contratoId: vigente.id, motivo: null };
  }

  const ultimo = await db.contrato.findFirst({
    where: { solicitante_id: solicitanteId, deleted_at: null },
    orderBy: { updated_at: "desc" },
    select: { status: true }
  });

  const motivo: ServiceBlockReason =
    ultimo?.status === "CANCELLED"
      ? "CONTRATO_CANCELADO"
      : ultimo?.status === "SUSPENDED"
        ? "CONTRATO_SUSPENSO"
        : ultimo?.status === "EXPIRED"
          ? "CONTRATO_VENCIDO"
          : "MANUAL";

  await db.solicitante.update({
    where: { id: solicitanteId },
    data: {
      contratoVigenteId: null,
      servico_bloqueado: true,
      servico_bloqueado_em: now,
      servico_bloqueado_motivo: motivo,
      updated_by: actorUserId ?? null
    }
  });

  return { bloqueado: true, contratoId: null, motivo };
}

/** Impede a sobreposição de janelas de vigência para o mesmo solicitante. */
async function assertSemSobreposicao(
  db: Db,
  params: {
    solicitanteId: string;
    inicioVigencia: Date;
    fimVigencia: Date | null;
    excludeId?: string;
  }
): Promise<void> {
  const outros = await db.contrato.findMany({
    where: {
      solicitante_id: params.solicitanteId,
      deleted_at: null,
      status: { not: "CANCELLED" },
      ...(params.excludeId ? { id: { not: params.excludeId } } : {})
    },
    select: { numero: true, inicioVigencia: true, fimVigencia: true }
  });

  const novoInicio = params.inicioVigencia.getTime();
  const novoFim = params.fimVigencia ? params.fimVigencia.getTime() : Number.POSITIVE_INFINITY;

  const conflito = outros.find((contrato) => {
    const inicio = contrato.inicioVigencia.getTime();
    const fim = contrato.fimVigencia ? contrato.fimVigencia.getTime() : Number.POSITIVE_INFINITY;
    return novoInicio < fim && inicio < novoFim;
  });

  if (conflito) {
    throw new ContratoError(
      `A vigência informada se sobrepõe ao contrato ${conflito.numero}. Ajuste as datas ou cancele o contrato conflitante.`,
      409
    );
  }
}

/** Garante que o número do contrato não está em uso. */
async function assertNumeroLivre(db: Db, numero: string, excludeId?: string): Promise<void> {
  const existente = await db.contrato.findFirst({
    where: { numero, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true }
  });
  if (existente) {
    throw new ContratoError("Já existe um contrato com este número.", 409);
  }
}

async function findContratoOrThrow(db: Db, id: string) {
  const contrato = await db.contrato.findUnique({ where: { id } });
  if (!contrato || contrato.deleted_at) {
    throw new ContratoError("Contrato não encontrado.", 404);
  }
  return contrato;
}

/** Lista contratos com filtros simples e paginação. */
export async function listContratos(filters: ListContratosFilters = {}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const where: Prisma.ContratoWhereInput = {
    deleted_at: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.solicitanteId ? { solicitante_id: filters.solicitanteId } : {}),
    ...(filters.vigenteEm ? vigenteWhere(filters.vigenteEm) : {}),
    ...(filters.vencendoAte
      ? { status: "ACTIVE", fimVigencia: { lte: filters.vencendoAte, gte: new Date() } }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { numero: { contains: filters.q, mode: "insensitive" } },
            { titulo: { contains: filters.q, mode: "insensitive" } },
            { solicitante: { nome_fantasia: { contains: filters.q, mode: "insensitive" } } },
            { solicitante: { razao_social: { contains: filters.q, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [items, total] = await Promise.all([
    prisma.contrato.findMany({
      where,
      orderBy: [{ status: "asc" }, { inicioVigencia: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        ...contratoInclude,
        _count: { select: { termos: true, tickets: true } }
      }
    }),
    prisma.contrato.count({ where })
  ]);

  return { items, meta: { total, page, pageSize } };
}

/** Detalhe do contrato com relações e histórico de auditoria. */
export async function getContrato(id: string) {
  const contrato = await prisma.contrato.findFirst({
    where: { id, deleted_at: null },
    include: {
      ...contratoInclude,
      renovadoDe: { select: { id: true, numero: true, titulo: true } },
      renovacoes: { select: { id: true, numero: true, status: true, inicioVigencia: true } },
      _count: { select: { termos: true, tickets: true } }
    }
  });

  if (!contrato) return null;

  const historico = await prisma.auditLog.findMany({
    where: { entity: "contrato", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return { ...contrato, historico };
}

/** Cria um contrato em rascunho (a ativação é uma ação separada). */
export async function createContrato(input: CreateContratoInput, actor: ContratoActor = {}) {
  const fim = input.fimVigencia ?? null;
  if (fim && fim <= input.inicioVigencia) {
    throw new ContratoError("A data final da vigência deve ser posterior à data inicial.");
  }
  if (input.termos?.length) {
    input.termos.forEach(assertTermoValido);
  }

  return prisma.$transaction(async (tx) => {
    await assertNumeroLivre(tx, input.numero);

    if (input.solicitanteId) {
      const solicitante = await tx.solicitante.findUnique({
        where: { id: input.solicitanteId },
        select: { id: true }
      });
      if (!solicitante) throw new ContratoError("Solicitante não encontrado.", 404);

      await assertSemSobreposicao(tx, {
        solicitanteId: input.solicitanteId,
        inicioVigencia: input.inicioVigencia,
        fimVigencia: fim
      });
    }

    const contrato = await tx.contrato.create({
      data: {
        numero: input.numero,
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        solicitante_id: input.solicitanteId ?? null,
        slaPolicyId: input.slaPolicyId ?? null,
        slaRespostaHoras: input.slaRespostaHoras ?? null,
        slaSolucaoHoras: input.slaSolucaoHoras ?? null,
        status: "DRAFT",
        inicioVigencia: input.inicioVigencia,
        fimVigencia: fim,
        renovacaoAutomatica: input.renovacaoAutomatica ?? false,
        diasAvisoVencimento: input.diasAvisoVencimento ?? [30, 15, 7],
        valorMensal: input.valorMensal ?? null,
        penalidadeDescricao: input.penalidadeDescricao ?? null,
        documentoUrl: input.documentoUrl ?? null,
        observacoes: input.observacoes ?? null,
        created_by: actor.id ?? null,
        updated_by: actor.id ?? null,
        ...(input.termos?.length ? { termos: { create: input.termos.map(mapTermoInput) } } : {})
      },
      include: contratoInclude
    });

    await writeAudit(tx, {
      solicitanteId: contrato.solicitante_id,
      actorUserId: actor.id,
      action: "CREATE",
      entityId: contrato.id,
      metadata: { numero: contrato.numero, titulo: contrato.titulo }
    });

    return contrato;
  });
}

/** Atualiza os dados cadastrais/comerciais do contrato (não muda status). */
export async function updateContrato(id: string, input: UpdateContratoInput, actor: ContratoActor = {}) {
  if (input.termos?.length) {
    input.termos.forEach(assertTermoValido);
  }

  return prisma.$transaction(async (tx) => {
    const atual = await findContratoOrThrow(tx, id);

    const inicio = input.inicioVigencia ?? atual.inicioVigencia;
    const fim = input.fimVigencia !== undefined ? input.fimVigencia : atual.fimVigencia;
    if (fim && fim <= inicio) {
      throw new ContratoError("A data final da vigência deve ser posterior à data inicial.");
    }

    if (input.numero && input.numero !== atual.numero) {
      await assertNumeroLivre(tx, input.numero, id);
    }

    const solicitanteId = input.solicitanteId !== undefined ? input.solicitanteId : atual.solicitante_id;
    const mudouSolicitante = input.solicitanteId !== undefined && input.solicitanteId !== atual.solicitante_id;

    if (mudouSolicitante && solicitanteId) {
      const solicitante = await tx.solicitante.findUnique({ where: { id: solicitanteId }, select: { id: true } });
      if (!solicitante) throw new ContratoError("Solicitante não encontrado.", 404);
    }

    if ((mudouSolicitante || input.inicioVigencia || input.fimVigencia !== undefined) && solicitanteId) {
      await assertSemSobreposicao(tx, { solicitanteId, inicioVigencia: inicio, fimVigencia: fim, excludeId: id });
    }

    const contrato = await tx.contrato.update({
      where: { id },
      data: {
        ...(input.numero !== undefined ? { numero: input.numero } : {}),
        ...(input.titulo !== undefined ? { titulo: input.titulo } : {}),
        ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
        ...(input.solicitanteId !== undefined ? { solicitante_id: input.solicitanteId } : {}),
        ...(input.slaPolicyId !== undefined ? { slaPolicyId: input.slaPolicyId } : {}),
        ...(input.slaRespostaHoras !== undefined ? { slaRespostaHoras: input.slaRespostaHoras } : {}),
        ...(input.slaSolucaoHoras !== undefined ? { slaSolucaoHoras: input.slaSolucaoHoras } : {}),
        ...(input.inicioVigencia !== undefined ? { inicioVigencia: input.inicioVigencia } : {}),
        ...(input.fimVigencia !== undefined ? { fimVigencia: input.fimVigencia } : {}),
        ...(input.renovacaoAutomatica !== undefined ? { renovacaoAutomatica: input.renovacaoAutomatica } : {}),
        ...(input.diasAvisoVencimento !== undefined ? { diasAvisoVencimento: input.diasAvisoVencimento } : {}),
        ...(input.valorMensal !== undefined ? { valorMensal: input.valorMensal } : {}),
        ...(input.penalidadeDescricao !== undefined ? { penalidadeDescricao: input.penalidadeDescricao } : {}),
        ...(input.documentoUrl !== undefined ? { documentoUrl: input.documentoUrl } : {}),
        ...(input.observacoes !== undefined ? { observacoes: input.observacoes } : {}),
        updated_by: actor.id ?? null
      },
      include: contratoInclude
    });

    // Reavalia o serviço dos solicitantes envolvidos quando o vínculo muda
    if (mudouSolicitante) {
      const afetados = new Set<string>();
      if (atual.solicitante_id) afetados.add(atual.solicitante_id);
      if (solicitanteId) afetados.add(solicitanteId);
      for (const sid of afetados) {
        await syncServiceStatus(sid, tx, actor.id);
      }
    }

    await writeAudit(tx, {
      solicitanteId: contrato.solicitante_id,
      actorUserId: actor.id,
      action: "UPDATE",
      entityId: contrato.id
    });

    return contrato;
  });
}

/** Vincula (ou reatribui) o contrato a um solicitante. */
export async function vincularContrato(
  contratoId: string,
  solicitanteId: string | null,
  actor: ContratoActor = {}
) {
  return prisma.$transaction(async (tx) => {
    const atual = await findContratoOrThrow(tx, contratoId);

    if (solicitanteId) {
      const solicitante = await tx.solicitante.findUnique({ where: { id: solicitanteId }, select: { id: true } });
      if (!solicitante) throw new ContratoError("Solicitante não encontrado.", 404);

      await assertSemSobreposicao(tx, {
        solicitanteId,
        inicioVigencia: atual.inicioVigencia,
        fimVigencia: atual.fimVigencia,
        excludeId: contratoId
      });
    }

    const contrato = await tx.contrato.update({
      where: { id: contratoId },
      data: { solicitante_id: solicitanteId, updated_by: actor.id ?? null },
      include: contratoInclude
    });

    // Reavalia o serviço do solicitante anterior e do novo
    const afetados = new Set<string>();
    if (atual.solicitante_id) afetados.add(atual.solicitante_id);
    if (solicitanteId) afetados.add(solicitanteId);
    for (const sid of afetados) {
      await syncServiceStatus(sid, tx, actor.id);
    }

    await writeAudit(tx, {
      solicitanteId,
      actorUserId: actor.id,
      action: "VINCULAR",
      entityId: contrato.id,
      metadata: { solicitanteAnterior: atual.solicitante_id }
    });

    return contrato;
  });
}

/** Ativa o contrato e libera o serviço do solicitante. */
export async function ativarContrato(id: string, actor: ContratoActor = {}) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const atual = await findContratoOrThrow(tx, id);

    if (atual.status === "CANCELLED") {
      throw new ContratoError("Um contrato cancelado não pode ser ativado. Crie um novo contrato.", 409);
    }
    if (!atual.solicitante_id) {
      throw new ContratoError("Vincule o contrato a uma empresa antes de ativá-lo.");
    }
    if (atual.fimVigencia && atual.fimVigencia <= now) {
      throw new ContratoError("A vigência deste contrato já encerrou. Renove o contrato para ativá-lo.", 409);
    }

    await assertSemSobreposicao(tx, {
      solicitanteId: atual.solicitante_id,
      inicioVigencia: atual.inicioVigencia,
      fimVigencia: atual.fimVigencia,
      excludeId: id
    });

    const outroAtivo = await tx.contrato.findFirst({
      where: { solicitante_id: atual.solicitante_id, status: "ACTIVE", deleted_at: null, id: { not: id } },
      select: { numero: true }
    });
    if (outroAtivo) {
      throw new ContratoError(
        `A empresa já possui o contrato ${outroAtivo.numero} ativo. Suspenda ou cancele antes de ativar outro.`,
        409
      );
    }

    const contrato = await tx.contrato.update({
      where: { id },
      data: { status: "ACTIVE", updated_by: actor.id ?? null },
      include: contratoInclude
    });

    await syncServiceStatus(atual.solicitante_id, tx, actor.id);
    await writeAudit(tx, {
      solicitanteId: atual.solicitante_id,
      actorUserId: actor.id,
      action: "ATIVAR",
      entityId: contrato.id
    });

    return contrato;
  });
}

/** Suspende o contrato e interrompe o serviço do solicitante. */
export async function suspenderContrato(id: string, actor: ContratoActor = {}) {
  return prisma.$transaction(async (tx) => {
    const atual = await findContratoOrThrow(tx, id);

    if (atual.status !== "ACTIVE") {
      throw new ContratoError("Somente contratos ativos podem ser suspensos.", 409);
    }

    const contrato = await tx.contrato.update({
      where: { id },
      data: { status: "SUSPENDED", updated_by: actor.id ?? null },
      include: contratoInclude
    });

    if (atual.solicitante_id) {
      await syncServiceStatus(atual.solicitante_id, tx, actor.id);
    }
    await writeAudit(tx, {
      solicitanteId: atual.solicitante_id,
      actorUserId: actor.id,
      action: "SUSPENDER",
      entityId: contrato.id
    });

    return contrato;
  });
}

/** Cancela o contrato (motivo obrigatório) e interrompe o serviço do solicitante. */
export async function cancelarContrato(id: string, motivo: string, actor: ContratoActor = {}) {
  const motivoLimpo = String(motivo ?? "").trim();
  if (motivoLimpo.length < 3) {
    throw new ContratoError("Informe o motivo do cancelamento (mínimo 3 caracteres).");
  }

  return prisma.$transaction(async (tx) => {
    const atual = await findContratoOrThrow(tx, id);

    if (atual.status === "CANCELLED") {
      throw new ContratoError("Este contrato já está cancelado.", 409);
    }

    const contrato = await tx.contrato.update({
      where: { id },
      data: {
        status: "CANCELLED",
        canceladoEm: new Date(),
        canceladoPor: actor.id ?? null,
        motivoCancelamento: motivoLimpo,
        updated_by: actor.id ?? null
      },
      include: contratoInclude
    });

    if (atual.solicitante_id) {
      await syncServiceStatus(atual.solicitante_id, tx, actor.id);
    }
    await writeAudit(tx, {
      solicitanteId: atual.solicitante_id,
      actorUserId: actor.id,
      action: "CANCELAR",
      entityId: contrato.id,
      metadata: { motivo: motivoLimpo }
    });

    return contrato;
  });
}

/**
 * Renova o contrato criando um novo a partir dele, copiando termos e condições.
 * A janela do contrato de origem é truncada para não sobrepor a nova vigência.
 */
export async function renovarContrato(id: string, input: RenovarContratoInput = {}, actor: ContratoActor = {}) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const origem = await tx.contrato.findUnique({ where: { id }, include: { termos: true } });
    if (!origem || origem.deleted_at) {
      throw new ContratoError("Contrato não encontrado.", 404);
    }
    if (origem.status === "CANCELLED") {
      throw new ContratoError("Um contrato cancelado não pode ser renovado. Crie um novo contrato.", 409);
    }

    const inicio =
      input.inicioVigencia ??
      (origem.fimVigencia && origem.fimVigencia > now ? origem.fimVigencia : now);

    const duracao = origem.fimVigencia ? origem.fimVigencia.getTime() - origem.inicioVigencia.getTime() : null;
    const fim =
      input.fimVigencia !== undefined
        ? input.fimVigencia
        : duracao
          ? new Date(inicio.getTime() + duracao)
          : null;

    if (fim && fim <= inicio) {
      throw new ContratoError("A data final da vigência deve ser posterior à data inicial.");
    }

    const numero = input.numero?.trim() || (await gerarNumeroRenovacao(tx, origem.numero));
    await assertNumeroLivre(tx, numero);

    // Trunca a vigência do contrato de origem para liberar a nova janela
    if (origem.fimVigencia === null || origem.fimVigencia.getTime() > inicio.getTime()) {
      await tx.contrato.update({
        where: { id },
        data: {
          fimVigencia: inicio,
          ...(origem.status === "ACTIVE" ? { status: "EXPIRED" } : {}),
          updated_by: actor.id ?? null
        }
      });
    } else if (origem.status === "ACTIVE") {
      await tx.contrato.update({ where: { id }, data: { status: "EXPIRED", updated_by: actor.id ?? null } });
    }

    if (origem.solicitante_id) {
      await assertSemSobreposicao(tx, {
        solicitanteId: origem.solicitante_id,
        inicioVigencia: inicio,
        fimVigencia: fim
      });
    }

    const novo = await tx.contrato.create({
      data: {
        numero,
        titulo: origem.titulo,
        descricao: origem.descricao,
        solicitante_id: origem.solicitante_id,
        slaPolicyId: origem.slaPolicyId,
        slaRespostaHoras: origem.slaRespostaHoras,
        slaSolucaoHoras: origem.slaSolucaoHoras,
        status: input.status ?? "ACTIVE",
        inicioVigencia: inicio,
        fimVigencia: fim,
        renovacaoAutomatica: origem.renovacaoAutomatica,
        diasAvisoVencimento: origem.diasAvisoVencimento,
        valorMensal: input.valorMensal !== undefined ? input.valorMensal : origem.valorMensal,
        penalidadeDescricao: origem.penalidadeDescricao,
        documentoUrl: origem.documentoUrl,
        observacoes: input.observacoes !== undefined ? input.observacoes : origem.observacoes,
        renovadoDeId: origem.id,
        created_by: actor.id ?? null,
        updated_by: actor.id ?? null,
        ...(origem.termos.length
          ? {
              termos: {
                create: origem.termos.map((termo) => ({
                  escopo: termo.escopo,
                  tipoTicketId: termo.tipoTicketId,
                  categoriaId: termo.categoriaId,
                  prioridade: termo.prioridade,
                  slaRespostaHoras: termo.slaRespostaHoras,
                  slaSolucaoHoras: termo.slaSolucaoHoras,
                  ativo: termo.ativo
                }))
              }
            }
          : {})
      },
      include: contratoInclude
    });

    if (origem.solicitante_id) {
      await syncServiceStatus(origem.solicitante_id, tx, actor.id);
    }
    await writeAudit(tx, {
      solicitanteId: origem.solicitante_id,
      actorUserId: actor.id,
      action: "RENOVAR",
      entityId: novo.id,
      metadata: { contratoAnterior: origem.numero, novoContrato: novo.numero }
    });

    return novo;
  });
}

/** Gera um número de contrato para a renovação (ex.: `CT-001-R2`). */
async function gerarNumeroRenovacao(db: Db, numeroOrigem: string): Promise<string> {
  const base = `${numeroOrigem}-R`;
  const existentes = await db.contrato.count({ where: { numero: { startsWith: base } } });
  return `${base}${existentes + 1}`;
}

/**
 * Marca como expirados os contratos ativos com vigência encerrada e ressincroniza o serviço.
 * Devolve os contratos expirados com os dados mínimos para notificação (ver `notifyContractExpired`).
 */
export async function expirarContratosVencidos(actor: ContratoActor = {}) {
  const now = new Date();

  const vencidos = await prisma.contrato.findMany({
    where: { status: "ACTIVE", deleted_at: null, fimVigencia: { not: null, lte: now } },
    select: {
      id: true,
      numero: true,
      titulo: true,
      solicitante_id: true,
      renovacaoAutomatica: true,
      solicitante: { select: { nome_fantasia: true, razao_social: true } }
    }
  });

  const expirados: Array<{
    id: string;
    numero: string;
    titulo: string;
    solicitante_id: string | null;
    solicitanteNome: string | null;
  }> = [];
  const renovados: string[] = [];

  for (const contrato of vencidos) {
    if (contrato.renovacaoAutomatica && contrato.solicitante_id) {
      const novo = await renovarContrato(contrato.id, {}, actor);
      renovados.push(novo.numero);
      continue;
    }

    await prisma.contrato.update({
      where: { id: contrato.id },
      data: { status: "EXPIRED", updated_by: actor.id ?? null }
    });
    expirados.push({
      id: contrato.id,
      numero: contrato.numero,
      titulo: contrato.titulo,
      solicitante_id: contrato.solicitante_id,
      solicitanteNome: contrato.solicitante?.nome_fantasia || contrato.solicitante?.razao_social || null
    });
  }

  const solicitantesAfetados = Array.from(
    new Set(vencidos.map((contrato) => contrato.solicitante_id).filter((id): id is string => Boolean(id)))
  );
  for (const solicitanteId of solicitantesAfetados) {
    await syncServiceStatus(solicitanteId, prisma, actor.id);
  }

  return { expirados, renovados, solicitantesAfetados: solicitantesAfetados.length };
}

/** Contratos de uma empresa: vigente + histórico. */
export async function listContratosDoSolicitante(solicitanteId: string) {
  const contratos = await prisma.contrato.findMany({
    where: { solicitante_id: solicitanteId, deleted_at: null },
    orderBy: [{ status: "asc" }, { inicioVigencia: "desc" }],
    include: {
      slaPolicy: { select: { id: true, nome: true, slaSolucaoHoras: true } },
      _count: { select: { termos: true } }
    }
  });

  return {
    contratos,
    vigente: contratos.find((contrato) => contrato.status === "ACTIVE") ?? null
  };
}

/** Lista contratos elegíveis para vínculo (sem empresa ou rascunhos de outras empresas). */
export async function listContratosDisponiveis() {
  return prisma.contrato.findMany({
    where: {
      deleted_at: null,
      OR: [{ solicitante_id: null }, { status: "DRAFT" }]
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      numero: true,
      titulo: true,
      status: true,
      inicioVigencia: true,
      fimVigencia: true,
      valorMensal: true
    }
  });
}

/** Desativa (soft delete) o contrato e ressincroniza o serviço do solicitante. */
export async function removerContrato(id: string, actor: ContratoActor = {}) {
  return prisma.$transaction(async (tx) => {
    const atual = await findContratoOrThrow(tx, id);

    const contrato = await tx.contrato.update({
      where: { id },
      data: { deleted_at: new Date(), updated_by: actor.id ?? null },
      include: contratoInclude
    });

    if (atual.solicitante_id) {
      await syncServiceStatus(atual.solicitante_id, tx, actor.id);
    }
    await writeAudit(tx, {
      solicitanteId: atual.solicitante_id,
      actorUserId: actor.id,
      action: "DELETE",
      entityId: contrato.id
    });

    return contrato;
  });
}

/* ---------------------------------- Termos de SLA ---------------------------------- */

export async function listTermos(contratoId: string) {
  return prisma.contratoSlaTermo.findMany({
    where: { contratoId },
    orderBy: [{ escopo: "asc" }, { created_at: "asc" }],
    include: {
      tipoTicket: { select: { id: true, nome: true } },
      categoria: { select: { id: true, nome: true } }
    }
  });
}

export async function createTermo(contratoId: string, input: ContratoTermoInput, actor: ContratoActor = {}) {
  assertTermoValido(input);

  return prisma.$transaction(async (tx) => {
    await findContratoOrThrow(tx, contratoId);

    const termo = await tx.contratoSlaTermo.create({
      data: { contratoId, created_by: actor.id ?? null, updated_by: actor.id ?? null, ...mapTermoInput(input) },
      include: {
        tipoTicket: { select: { id: true, nome: true } },
        categoria: { select: { id: true, nome: true } }
      }
    });

    await writeAudit(tx, {
      actorUserId: actor.id,
      action: "TERMO_CREATE",
      entityId: contratoId,
      metadata: { termoId: termo.id, escopo: termo.escopo }
    });

    return termo;
  });
}

export async function updateTermo(termoId: string, input: Partial<ContratoTermoInput>, actor: ContratoActor = {}) {
  return prisma.$transaction(async (tx) => {
    const atual = await tx.contratoSlaTermo.findUnique({ where: { id: termoId } });
    if (!atual) throw new ContratoError("Termo de SLA não encontrado.", 404);

    const merged: ContratoTermoInput = {
      escopo: input.escopo ?? atual.escopo,
      tipoTicketId: input.tipoTicketId !== undefined ? input.tipoTicketId : atual.tipoTicketId,
      categoriaId: input.categoriaId !== undefined ? input.categoriaId : atual.categoriaId,
      prioridade: input.prioridade !== undefined ? input.prioridade : atual.prioridade,
      slaRespostaHoras: input.slaRespostaHoras !== undefined ? input.slaRespostaHoras : atual.slaRespostaHoras,
      slaSolucaoHoras: input.slaSolucaoHoras ?? atual.slaSolucaoHoras,
      ativo: input.ativo !== undefined ? input.ativo : atual.ativo
    };
    assertTermoValido(merged);

    const termo = await tx.contratoSlaTermo.update({
      where: { id: termoId },
      data: { ...mapTermoInput(merged), updated_by: actor.id ?? null },
      include: {
        tipoTicket: { select: { id: true, nome: true } },
        categoria: { select: { id: true, nome: true } }
      }
    });

    await writeAudit(tx, {
      actorUserId: actor.id,
      action: "TERMO_UPDATE",
      entityId: atual.contratoId,
      metadata: { termoId: termo.id }
    });

    return termo;
  });
}

/** Desativa o termo (soft delete) preservando o histórico. */
export async function removerTermo(termoId: string, actor: ContratoActor = {}) {
  return prisma.$transaction(async (tx) => {
    const atual = await tx.contratoSlaTermo.findUnique({ where: { id: termoId } });
    if (!atual) throw new ContratoError("Termo de SLA não encontrado.", 404);

    const termo = await tx.contratoSlaTermo.update({
      where: { id: termoId },
      data: { ativo: false, updated_by: actor.id ?? null }
    });

    await writeAudit(tx, {
      actorUserId: actor.id,
      action: "TERMO_DELETE",
      entityId: atual.contratoId,
      metadata: { termoId: termo.id }
    });

    return termo;
  });
}

/* ------------------------------ Resolução de SLA ------------------------------ */

export interface SlaDoTicketInput extends SlaTicketRef {
  createdAt: Date;
  solutionSlaAt?: Date | null;
  tipoTicketSlaHours?: number | null;
  solicitanteId?: string | null;
}

export interface SlaDoTicketResult extends SlaResolution {
  contratoId: string | null;
  /** Ticket nasce fora de contrato (serviço do solicitante interrompido) — não conta SLA. */
  foraDeContrato: boolean;
  /** Dias restantes até o fim da vigência do contrato aplicado. */
  diasParaVencer: number | null;
}

/**
 * Resolve o SLA de um ticket consultando o contrato vigente do solicitante.
 * Usado na criação do ticket para gravar o snapshot (`contrato_id`, horas e fonte).
 */
export async function resolveSlaDoTicket(input: SlaDoTicketInput, db: Db = prisma): Promise<SlaDoTicketResult> {
  let contratoRef: SlaContratoRef | null = null;
  let contratoId: string | null = null;
  let foraDeContrato = false;
  let diasParaVencer: number | null = null;

  if (input.solicitanteId) {
    const solicitante = await db.solicitante.findUnique({
      where: { id: input.solicitanteId },
      select: {
        servico_bloqueado: true,
        contratoVigente: {
          include: {
            slaPolicy: {
              select: {
                slaSolucaoHoras: true,
                slaRespostaHoras: true,
                horarioComercialAtivo: true,
                horarioComercial: true,
                feriados: true
              }
            },
            termos: true
          }
        }
      }
    });

    foraDeContrato = Boolean(solicitante?.servico_bloqueado);

    const vigente = solicitante?.contratoVigente;
    if (vigente) {
      contratoId = vigente.id;
      diasParaVencer = vigente.fimVigencia
        ? Math.ceil((vigente.fimVigencia.getTime() - input.createdAt.getTime()) / MS_PER_DAY)
        : null;
      contratoRef = {
        slaSolucaoHoras: vigente.slaSolucaoHoras,
        slaRespostaHoras: vigente.slaRespostaHoras,
        policy: vigente.slaPolicy
          ? {
              slaSolucaoHoras: vigente.slaPolicy.slaSolucaoHoras,
              slaRespostaHoras: vigente.slaPolicy.slaRespostaHoras,
              horarioComercialAtivo: vigente.slaPolicy.horarioComercialAtivo,
              horarioComercial: vigente.slaPolicy.horarioComercial,
              feriados: vigente.slaPolicy.feriados
            }
          : null,
        termos: vigente.termos.map(toSlaTermo)
      };
    }
  }

  const resolution = resolveSla({
    createdAt: input.createdAt,
    solutionSlaAt: input.solutionSlaAt,
    tipoTicketSlaHours: input.tipoTicketSlaHours,
    ticket: {
      tipoTicketId: input.tipoTicketId ?? null,
      categoriaId: input.categoriaId ?? null,
      priority: input.priority ?? null
    },
    contrato: contratoRef
  });

  return { ...resolution, contratoId, foraDeContrato, diasParaVencer };
}

/** Simula a resolução do SLA para um contexto, sem persistir nada. */
export async function previewSla(contratoId: string, input: Partial<SlaDoTicketInput> = {}) {
  const contrato = await prisma.contrato.findFirst({
    where: { id: contratoId, deleted_at: null },
    include: {
      slaPolicy: {
        select: {
          slaSolucaoHoras: true,
          slaRespostaHoras: true,
          horarioComercialAtivo: true,
          horarioComercial: true,
          feriados: true
        }
      },
      termos: true
    }
  });
  if (!contrato) throw new ContratoError("Contrato não encontrado.", 404);

  const createdAt = input.createdAt ?? new Date();
  const resolution = resolveSla({
    createdAt,
    solutionSlaAt: input.solutionSlaAt ?? null,
    tipoTicketSlaHours: input.tipoTicketSlaHours ?? null,
    ticket: {
      tipoTicketId: input.tipoTicketId ?? null,
      categoriaId: input.categoriaId ?? null,
      priority: input.priority ?? null
    },
    contrato: {
      slaSolucaoHoras: contrato.slaSolucaoHoras,
      slaRespostaHoras: contrato.slaRespostaHoras,
      policy: contrato.slaPolicy
        ? {
            slaSolucaoHoras: contrato.slaPolicy.slaSolucaoHoras,
            slaRespostaHoras: contrato.slaPolicy.slaRespostaHoras,
            horarioComercialAtivo: contrato.slaPolicy.horarioComercialAtivo,
            horarioComercial: contrato.slaPolicy.horarioComercial,
            feriados: contrato.slaPolicy.feriados
          }
        : null,
      termos: contrato.termos.map(toSlaTermo)
    }
  });

  return { ...resolution, createdAt, contratoId };
}

/* ------------------------------ Política global ------------------------------ */

export async function getPoliticaGlobal() {
  const politica = await prisma.slaPolicy.findFirst({
    where: { isDefault: true, ativo: true },
    orderBy: { updated_at: "desc" }
  });
  return politica;
}

export async function upsertPoliticaGlobal(
  input: {
    nome?: string;
    descricao?: string | null;
    slaRespostaHoras?: number | null;
    slaSolucaoHoras: number;
    alertaAtencaoPct?: number;
    alertaCriticoPct?: number;
    horarioComercialAtivo?: boolean;
    horarioComercial?: { timezone: string; diasUteis: number[]; inicio: string; fim: string } | null;
    feriados?: string[] | null;
  },
  actor: ContratoActor = {}
) {
  if (!Number.isFinite(input.slaSolucaoHoras) || input.slaSolucaoHoras <= 0) {
    throw new ContratoError("Informe as horas de solução da política global (maior que zero).");
  }

  const atual = await getPoliticaGlobal();

  // Campos JSON só são gravados quando explicitamente informados.
  const jsonFields = {
    ...(input.horarioComercialAtivo !== undefined ? { horarioComercialAtivo: input.horarioComercialAtivo } : {}),
    ...(input.horarioComercial ? { horarioComercial: input.horarioComercial as Prisma.InputJsonValue } : {}),
    ...(input.feriados ? { feriados: input.feriados as Prisma.InputJsonValue } : {})
  };

  if (atual) {
    return prisma.slaPolicy.update({
      where: { id: atual.id },
      data: {
        ...(input.nome !== undefined ? { nome: input.nome } : {}),
        ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
        ...(input.slaRespostaHoras !== undefined ? { slaRespostaHoras: input.slaRespostaHoras } : {}),
        slaSolucaoHoras: input.slaSolucaoHoras,
        ...(input.alertaAtencaoPct !== undefined ? { alertaAtencaoPct: input.alertaAtencaoPct } : {}),
        ...(input.alertaCriticoPct !== undefined ? { alertaCriticoPct: input.alertaCriticoPct } : {}),
        ...jsonFields,
        updated_by: actor.id ?? null
      }
    });
  }

  return prisma.slaPolicy.create({
    data: {
      nome: input.nome?.trim() || "SLA padrão do sistema",
      descricao: input.descricao ?? null,
      isDefault: true,
      slaRespostaHoras: input.slaRespostaHoras ?? null,
      slaSolucaoHoras: input.slaSolucaoHoras,
      alertaAtencaoPct: input.alertaAtencaoPct ?? 70,
      alertaCriticoPct: input.alertaCriticoPct ?? 85,
      ...jsonFields,
      created_by: actor.id ?? null,
      updated_by: actor.id ?? null
    }
  });
}

/* ------------------------------ Relatório de conformidade ------------------------------ */

const VENCENDO_EM_DIAS = 30;

/** Converte Decimal | number | null em number (ou null). */
function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Relatório de conformidade por contrato: cumprimento de SLA (resolvidos dentro
 * do prazo) e valor mensal contratado no período informado.
 *
 * Conformidade = tickets com evento `DONE` cujo `createdAt` do evento é menor ou
 * igual ao `solutionSlaAt` do ticket, sobre o total de tickets resolvidos.
 */
export async function getContractComplianceReport(window: { from: Date; to: Date }): Promise<ContractComplianceReport> {
  const limiteVencimento = new Date(window.to.getTime() + VENCENDO_EM_DIAS * MS_PER_DAY);

  const [contratos, tickets, ticketsForaDeContrato, contratosAtivos, contratosVencendo30d, contratosCancelados] =
    await Promise.all([
      prisma.contrato.findMany({
        where: { deleted_at: null },
        select: {
          id: true,
          numero: true,
          titulo: true,
          status: true,
          valorMensal: true,
          slaSolucaoHoras: true,
          inicioVigencia: true,
          fimVigencia: true,
          solicitante: { select: { nome_fantasia: true, razao_social: true } }
        },
        orderBy: [{ status: "asc" }, { numero: "asc" }]
      }),
      prisma.ticket.findMany({
        where: {
          deleted_at: null,
          contrato_id: { not: null },
          createdAt: { gte: window.from, lte: window.to }
        },
        select: { id: true, contrato_id: true, solutionSlaAt: true, foraDeContrato: true }
      }),
      prisma.ticket.count({
        where: { deleted_at: null, foraDeContrato: true, createdAt: { gte: window.from, lte: window.to } }
      }),
      prisma.contrato.count({ where: { deleted_at: null, status: "ACTIVE" } }),
      prisma.contrato.count({
        where: { deleted_at: null, status: "ACTIVE", fimVigencia: { not: null, lte: limiteVencimento } }
      }),
      prisma.contrato.count({
        where: { deleted_at: null, status: "CANCELLED", canceladoEm: { gte: window.from, lte: window.to } }
      })
    ]);

  const ticketIds = tickets.map((ticket) => ticket.id);
  const doneEvents = ticketIds.length
    ? await prisma.ticketEvent.groupBy({
        by: ["ticketId"],
        where: { ticketId: { in: ticketIds }, toStatus: "DONE" },
        _min: { createdAt: true }
      })
    : [];
  const resolvidoEm = new Map<string, Date | null>(
    doneEvents.map((event) => [event.ticketId, event._min.createdAt ?? null])
  );

  type Agg = { total: number; foraDeContrato: number; resolvidos: number; dentroSla: number };
  const porContrato = new Map<string, Agg>();

  for (const ticket of tickets) {
    const contratoId = ticket.contrato_id;
    if (!contratoId) continue;

    const agg = porContrato.get(contratoId) ?? { total: 0, foraDeContrato: 0, resolvidos: 0, dentroSla: 0 };
    agg.total += 1;
    if (ticket.foraDeContrato) agg.foraDeContrato += 1;

    const done = resolvidoEm.get(ticket.id) ?? null;
    if (done) {
      agg.resolvidos += 1;
      if (ticket.solutionSlaAt && done.getTime() <= ticket.solutionSlaAt.getTime()) {
        agg.dentroSla += 1;
      }
    }

    porContrato.set(contratoId, agg);
  }

  const items: ContractComplianceItem[] = contratos.map((contrato) => {
    const agg = porContrato.get(contrato.id) ?? { total: 0, foraDeContrato: 0, resolvidos: 0, dentroSla: 0 };
    return {
      contratoId: contrato.id,
      numero: contrato.numero,
      titulo: contrato.titulo,
      cliente: contrato.solicitante?.nome_fantasia || contrato.solicitante?.razao_social || null,
      status: String(contrato.status),
      valorMensal: decimalToNumber(contrato.valorMensal),
      slaSolucaoHoras: contrato.slaSolucaoHoras ?? null,
      vigencia: {
        inicio: contrato.inicioVigencia.toISOString(),
        fim: contrato.fimVigencia ? contrato.fimVigencia.toISOString() : null
      },
      ticketsTotal: agg.total,
      ticketsForaDeContrato: agg.foraDeContrato,
      ticketsResolvidos: agg.resolvidos,
      ticketsDentroSla: agg.dentroSla,
      cumprimentoPct: agg.resolvidos ? Number(((agg.dentroSla / agg.resolvidos) * 100).toFixed(1)) : null
    };
  });

  const totalResolvidos = items.reduce((acc, item) => acc + item.ticketsResolvidos, 0);
  const totalDentroSla = items.reduce((acc, item) => acc + item.ticketsDentroSla, 0);
  const valorMensalTotal = items
    .filter((item) => item.status === "ACTIVE")
    .reduce((acc, item) => acc + (item.valorMensal ?? 0), 0);

  return {
    summary: {
      contratosAtivos,
      contratosVencendo30d,
      contratosCancelados,
      valorMensalTotal: Number(valorMensalTotal.toFixed(2)),
      ticketsForaDeContrato,
      cumprimentoMedioPct: totalResolvidos ? Number(((totalDentroSla / totalResolvidos) * 100).toFixed(1)) : null
    },
    items
  };
}
