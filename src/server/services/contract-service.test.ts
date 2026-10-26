import { beforeEach, describe, expect, it, vi } from "vitest";

const contrato = {
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  count: vi.fn()
};
const solicitante = { findUnique: vi.fn(), update: vi.fn() };
const auditLog = { create: vi.fn() };
const slaPolicy = { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() };
const contratoSlaTermo = { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() };
const ticket = { findMany: vi.fn(), count: vi.fn() };
const ticketEvent = { groupBy: vi.fn() };

const prismaMock: any = { contrato, solicitante, auditLog, slaPolicy, contratoSlaTermo, ticket, ticketEvent };
prismaMock.$transaction = vi.fn(async (callback: any) => callback(prismaMock));

vi.mock("@/lib/prisma", () => ({
  Prisma: { SortOrder: { asc: "asc", desc: "desc" } },
  prisma: prismaMock
}));

const DIA = 24 * 60 * 60 * 1000;
const agora = new Date("2026-06-01T12:00:00.000Z");
const vigencia = {
  inicioVigencia: new Date(agora.getTime() - 30 * DIA),
  fimVigencia: new Date(agora.getTime() + 30 * DIA)
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(agora);

  contrato.findFirst.mockResolvedValue(null);
  contrato.findUnique.mockResolvedValue(null);
  contrato.findMany.mockResolvedValue([]);
  contrato.count.mockResolvedValue(0);
  contrato.create.mockImplementation(async ({ data }: any) => ({
    id: "novo",
    status: data.status,
    numero: data.numero,
    titulo: data.titulo ?? "Contrato",
    solicitante_id: data.solicitante_id ?? null,
    ...data
  }));
  contrato.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));

  solicitante.findUnique.mockResolvedValue({ id: "s1" });
  solicitante.update.mockResolvedValue({});
  auditLog.create.mockResolvedValue({});
  ticket.findMany.mockResolvedValue([]);
  ticket.count.mockResolvedValue(0);
  ticketEvent.groupBy.mockResolvedValue([]);
});

describe("contract-service.syncServiceStatus", () => {
  it("desbloqueia o serviço quando existe contrato vigente e é idempotente", async () => {
    contrato.findFirst.mockResolvedValue({ id: "c1" });
    const { syncServiceStatus } = await import("./contract-service");

    const primeiro = await syncServiceStatus("s1");
    const segundo = await syncServiceStatus("s1");

    expect(primeiro).toEqual({ bloqueado: false, contratoId: "c1", motivo: null });
    expect(segundo).toEqual(primeiro);
    expect(solicitante.update).toHaveBeenCalledTimes(2);
    expect(solicitante.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "s1" },
        data: expect.objectContaining({ contratoVigenteId: "c1", servico_bloqueado: false })
      })
    );
  });

  it("bloqueia o serviço com motivo derivado do último contrato cancelado", async () => {
    contrato.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: "CANCELLED" });
    const { syncServiceStatus } = await import("./contract-service");

    const resultado = await syncServiceStatus("s1");

    expect(resultado).toEqual({ bloqueado: true, contratoId: null, motivo: "CONTRATO_CANCELADO" });
    expect(solicitante.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contratoVigenteId: null,
          servico_bloqueado: true,
          servico_bloqueado_motivo: "CONTRATO_CANCELADO"
        })
      })
    );
  });
});

describe("contract-service.createContrato", () => {
  it("cria o contrato em rascunho", async () => {
    const { createContrato } = await import("./contract-service");

    await createContrato({
      numero: "CT-001",
      titulo: "Contrato anual",
      solicitanteId: "s1",
      inicioVigencia: vigencia.inicioVigencia,
      fimVigencia: vigencia.fimVigencia
    });

    expect(contrato.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT", numero: "CT-001" }) })
    );
    expect(auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ entity: "contrato", action: "CREATE" }) })
    );
  });

  it("rejeita número de contrato já utilizado", async () => {
    contrato.findFirst.mockResolvedValue({ id: "outro" });
    const { createContrato, ContratoError } = await import("./contract-service");

    const promise = createContrato({
      numero: "CT-001",
      titulo: "Contrato anual",
      inicioVigencia: vigencia.inicioVigencia
    });

    await expect(promise).rejects.toBeInstanceOf(ContratoError);
    await expect(promise).rejects.toMatchObject({ status: 409 });
  });

  it("rejeita vigência sobreposta para o mesmo solicitante", async () => {
    contrato.findMany.mockResolvedValue([{ numero: "CT-000", ...vigencia }]);
    const { createContrato } = await import("./contract-service");

    await expect(
      createContrato({
        numero: "CT-002",
        titulo: "Contrato sobreposto",
        solicitanteId: "s1",
        inicioVigencia: vigencia.inicioVigencia,
        fimVigencia: vigencia.fimVigencia
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("valida o alvo do termo de SLA conforme o escopo", async () => {
    const { createContrato } = await import("./contract-service");

    await expect(
      createContrato({
        numero: "CT-003",
        titulo: "Contrato com termo inválido",
        inicioVigencia: vigencia.inicioVigencia,
        termos: [{ escopo: "TIPO_TICKET", slaSolucaoHoras: 4 }]
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("contract-service.ativarContrato", () => {
  it("não ativa contrato cancelado", async () => {
    contrato.findUnique.mockResolvedValue({
      id: "c1",
      status: "CANCELLED",
      solicitante_id: "s1",
      ...vigencia
    });
    const { ativarContrato } = await import("./contract-service");

    await expect(ativarContrato("c1")).rejects.toMatchObject({ status: 409 });
  });

  it("impede mais de um contrato ativo por empresa", async () => {
    contrato.findUnique.mockResolvedValue({
      id: "c1",
      status: "SUSPENDED",
      solicitante_id: "s1",
      ...vigencia
    });
    contrato.findFirst.mockResolvedValue({ numero: "CT-999" });
    const { ativarContrato } = await import("./contract-service");

    await expect(ativarContrato("c1")).rejects.toMatchObject({ status: 409 });
  });

  it("ativa o contrato e libera o serviço do solicitante", async () => {
    contrato.findUnique.mockResolvedValue({
      id: "c1",
      status: "DRAFT",
      solicitante_id: "s1",
      ...vigencia
    });
    // assertSemSobreposicao -> findMany ([]) ; outroAtivo -> findFirst (null) ; sync vigente -> findFirst (c1)
    contrato.findFirst.mockResolvedValueOnce(null).mockResolvedValue({ id: "c1" });
    const { ativarContrato } = await import("./contract-service");

    await ativarContrato("c1");

    expect(contrato.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1" }, data: expect.objectContaining({ status: "ACTIVE" }) })
    );
    expect(solicitante.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ servico_bloqueado: false }) })
    );
  });
});

describe("contract-service.cancelarContrato", () => {
  it("exige motivo com pelo menos 3 caracteres", async () => {
    const { cancelarContrato } = await import("./contract-service");

    await expect(cancelarContrato("c1", "ab")).rejects.toMatchObject({ status: 400 });
    expect(contrato.update).not.toHaveBeenCalled();
  });

  it("cancela o contrato e interrompe o serviço do solicitante", async () => {
    contrato.findUnique.mockResolvedValue({
      id: "c1",
      status: "ACTIVE",
      solicitante_id: "s1",
      ...vigencia
    });
    // sync: vigente -> null ; último contrato -> CANCELLED
    contrato.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: "CANCELLED" });
    const { cancelarContrato } = await import("./contract-service");

    await cancelarContrato("c1", "Inadimplência");

    expect(contrato.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED", motivoCancelamento: "Inadimplência" })
      })
    );
    expect(solicitante.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ servico_bloqueado: true, servico_bloqueado_motivo: "CONTRATO_CANCELADO" })
      })
    );
  });
});

describe("contract-service.renovarContrato", () => {
  const origem = {
    id: "c1",
    numero: "CT-001",
    titulo: "Contrato anual",
    descricao: null,
    solicitante_id: "s1",
    slaPolicyId: null,
    slaRespostaHoras: null,
    slaSolucaoHoras: 8,
    status: "ACTIVE",
    renovacaoAutomatica: false,
    diasAvisoVencimento: [30],
    valorMensal: 1000,
    penalidadeDescricao: null,
    documentoUrl: null,
    observacoes: null,
    deleted_at: null,
    ...vigencia,
    termos: [
      {
        escopo: "PRIORIDADE",
        tipoTicketId: null,
        categoriaId: null,
        prioridade: "HIGH",
        slaRespostaHoras: 2,
        slaSolucaoHoras: 4,
        ativo: true
      }
    ]
  };

  it("cria um novo contrato copiando os termos e trunca a vigência de origem", async () => {
    contrato.findUnique.mockResolvedValue(origem);
    contrato.findFirst.mockResolvedValueOnce(null).mockResolvedValue({ id: "c2" });
    const { renovarContrato } = await import("./contract-service");

    await renovarContrato("c1");

    expect(contrato.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          numero: "CT-001-R1",
          renovadoDeId: "c1",
          status: "ACTIVE",
          // A nova vigência inicia onde a anterior termina
          inicioVigencia: vigencia.fimVigencia,
          termos: { create: [expect.objectContaining({ escopo: "PRIORIDADE", slaSolucaoHoras: 4 })] }
        })
      })
    );

    // O contrato de origem é encerrado para liberar a nova janela
    const encerramento = contrato.update.mock.calls.find(([args]: any) => args.where.id === "c1");
    expect(encerramento?.[0].data).toMatchObject({ status: "EXPIRED" });
  });

  it("não renova contrato cancelado", async () => {
    contrato.findUnique.mockResolvedValue({ ...origem, status: "CANCELLED", termos: [] });
    const { renovarContrato } = await import("./contract-service");

    await expect(renovarContrato("c1")).rejects.toMatchObject({ status: 409 });
  });
});

describe("contract-service.política global", () => {
  it("cria a política padrão quando não existe", async () => {
    slaPolicy.findFirst.mockResolvedValue(null);
    slaPolicy.create.mockImplementation(async ({ data }: any) => ({ id: "p1", ...data }));
    const { upsertPoliticaGlobal } = await import("./contract-service");

    await upsertPoliticaGlobal({ slaSolucaoHoras: 12 });

    expect(slaPolicy.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDefault: true, slaSolucaoHoras: 12 })
      })
    );
  });

  it("atualiza a política padrão existente", async () => {
    slaPolicy.findFirst.mockResolvedValue({ id: "p1", isDefault: true, slaSolucaoHoras: 8 });
    slaPolicy.update.mockResolvedValue({ id: "p1", slaSolucaoHoras: 16 });
    const { upsertPoliticaGlobal } = await import("./contract-service");

    await upsertPoliticaGlobal({ slaSolucaoHoras: 16 });

    expect(slaPolicy.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1" }, data: expect.objectContaining({ slaSolucaoHoras: 16 }) })
    );
    expect(slaPolicy.create).not.toHaveBeenCalled();
  });
});

describe("contract-service.getContractComplianceReport", () => {
  const from = new Date("2026-06-01T00:00:00.000Z");
  const to = new Date("2026-06-30T23:59:59.999Z");

  it("calcula cumprimento por contrato e o resumo do período", async () => {
    contrato.findMany.mockResolvedValue([
      {
        id: "c1",
        numero: "CT-001",
        titulo: "Suporte 24x7",
        status: "ACTIVE",
        valorMensal: 3500,
        slaSolucaoHoras: 4,
        inicioVigencia: new Date("2026-01-01T00:00:00.000Z"),
        fimVigencia: new Date("2026-12-31T00:00:00.000Z"),
        solicitante: { nome_fantasia: "ACME", razao_social: null }
      }
    ]);
    ticket.findMany.mockResolvedValue([
      { id: "t1", contrato_id: "c1", solutionSlaAt: new Date("2026-06-10T12:00:00.000Z"), foraDeContrato: false },
      { id: "t2", contrato_id: "c1", solutionSlaAt: new Date("2026-06-11T12:00:00.000Z"), foraDeContrato: true },
      { id: "t3", contrato_id: "c1", solutionSlaAt: null, foraDeContrato: false }
    ]);
    // t1 dentro do prazo, t2 fora do prazo, t3 sem evento DONE (não resolvido)
    ticketEvent.groupBy.mockResolvedValue([
      { ticketId: "t1", _min: { createdAt: new Date("2026-06-10T10:00:00.000Z") } },
      { ticketId: "t2", _min: { createdAt: new Date("2026-06-11T18:00:00.000Z") } }
    ]);
    contrato.count
      .mockResolvedValueOnce(3) // ativos
      .mockResolvedValueOnce(1) // vencendo em 30d
      .mockResolvedValueOnce(2); // cancelados no período
    ticket.count.mockResolvedValue(4); // fora de contrato

    const { getContractComplianceReport } = await import("./contract-service");
    const report = await getContractComplianceReport({ from, to });

    expect(report.items).toHaveLength(1);
    const item = report.items[0];
    expect(item.cliente).toBe("ACME");
    expect(item.valorMensal).toBe(3500);
    expect(item.ticketsTotal).toBe(3);
    expect(item.ticketsForaDeContrato).toBe(1);
    expect(item.ticketsResolvidos).toBe(2);
    expect(item.ticketsDentroSla).toBe(1);
    expect(item.cumprimentoPct).toBe(50);

    expect(report.summary).toEqual({
      contratosAtivos: 3,
      contratosVencendo30d: 1,
      contratosCancelados: 2,
      valorMensalTotal: 3500,
      ticketsForaDeContrato: 4,
      cumprimentoMedioPct: 50
    });
  });

  it("retorna cumprimento nulo quando não há tickets resolvidos", async () => {
    contrato.findMany.mockResolvedValue([
      {
        id: "c2",
        numero: "CT-002",
        titulo: "Suporte básico",
        status: "DRAFT",
        valorMensal: null,
        slaSolucaoHoras: null,
        inicioVigencia: new Date("2026-06-01T00:00:00.000Z"),
        fimVigencia: null,
        solicitante: null
      }
    ]);

    const { getContractComplianceReport } = await import("./contract-service");
    const report = await getContractComplianceReport({ from, to });

    expect(report.items[0].cumprimentoPct).toBeNull();
    expect(report.items[0].cliente).toBeNull();
    expect(report.items[0].valorMensal).toBeNull();
    expect(report.summary.cumprimentoMedioPct).toBeNull();
    // Contrato em rascunho não entra no valor mensal contratado
    expect(report.summary.valorMensalTotal).toBe(0);
    expect(ticketEvent.groupBy).not.toHaveBeenCalled();
  });
});
