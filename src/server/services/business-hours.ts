/**
 * Cálculo de prazos em horas úteis (janela de horário comercial + feriados).
 *
 * Função pura e sem dependências externas: usa `Intl.DateTimeFormat` para
 * resolver o fuso horário, mantendo o cálculo determinístico e testável.
 * É opt-in — quando a política não habilita o horário comercial, o SLA
 * continua sendo calculado em horas corridas.
 */

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** Guarda contra configurações inconsistentes (janela sem dias úteis úteis). */
const MAX_DIAS = 3_660;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Configuração de horário comercial aplicada ao cálculo do SLA. */
export interface HorarioComercialConfig {
  /** Fuso IANA, ex.: `America/Sao_Paulo`. */
  timezone: string;
  /** Dias úteis (0 = domingo … 6 = sábado). */
  diasUteis: number[];
  /** Início da janela no formato `HH:mm`. */
  inicio: string;
  /** Fim da janela no formato `HH:mm`. */
  fim: string;
  /** Feriados no formato `yyyy-MM-dd` (no fuso configurado). */
  feriados: string[];
}

/** Valor padrão sugerido para a janela comercial brasileira. */
export const HORARIO_COMERCIAL_PADRAO: HorarioComercialConfig = {
  timezone: "America/Sao_Paulo",
  diasUteis: [1, 2, 3, 4, 5],
  inicio: "09:00",
  fim: "18:00",
  feriados: []
};

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Converte `HH:mm` em minutos desde a meia-noite (ou null quando inválido). */
function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;

  return horas * 60 + minutos;
}

/** Valida o fuso IANA usando o próprio runtime. */
function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** Restringe o valor a um objeto simples (não nulo e não array). */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Normaliza a configuração vinda do banco (JSON) para um objeto válido.
 * Retorna `null` quando a configuração está ausente ou inconsistente,
 * sinalizando ao chamador para manter o cálculo em horas corridas.
 */
export function parseHorarioComercial(value: unknown, feriados?: unknown): HorarioComercialConfig | null {
  const raw = asRecord(value);
  if (!raw) return null;

  const timezone = typeof raw.timezone === "string" ? raw.timezone.trim() : "";
  const inicio = typeof raw.inicio === "string" ? raw.inicio.trim() : "";
  const fim = typeof raw.fim === "string" ? raw.fim.trim() : "";

  if (!timezone || !isValidTimezone(timezone)) return null;

  const inicioMin = parseTime(inicio);
  const fimMin = parseTime(fim);
  if (inicioMin === null || fimMin === null || fimMin <= inicioMin) return null;

  const diasUteis = Array.isArray(raw.diasUteis)
    ? Array.from(
        new Set(
          raw.diasUteis.filter(
            (dia): dia is number => Number.isInteger(dia) && (dia as number) >= 0 && (dia as number) <= 6
          )
        )
      ).sort((a, b) => a - b)
    : [];
  if (diasUteis.length === 0) return null;

  const listaFeriados = Array.isArray(feriados)
    ? Array.from(
        new Set(feriados.filter((item): item is string => typeof item === "string" && DATE_KEY_PATTERN.test(item)))
      )
    : [];

  return { timezone, diasUteis, inicio, fim, feriados: listaFeriados };
}

/** Extrai os componentes de data/hora no fuso informado. */
function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    // Alguns runtimes devolvem "24" para a meia-noite; normalizamos para 0.
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second")
  };
}

/** Offset (ms) entre o horário local do fuso e o UTC para o instante informado. */
function offsetMs(date: Date, timezone: string): number {
  const parts = getZonedParts(date, timezone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Constrói o instante UTC correspondente a um horário de parede no fuso. */
function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date {
  const base = Date.UTC(year, month - 1, day, hour, minute, 0);
  let timestamp = base;

  // Duas passagens cobrem mudanças de offset (DST) sem bibliotecas externas.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    timestamp = base - offsetMs(new Date(timestamp), timezone);
  }

  return new Date(timestamp);
}

/** Chave de data `yyyy-MM-dd` no fuso configurado. */
function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Soma `hours` horas úteis a partir de `start`, respeitando a janela comercial,
 * os dias úteis e os feriados configurados. Retorna `start` quando a
 * configuração é inválida, para não travar o fluxo de criação de tickets.
 */
export function addBusinessHours(start: Date, hours: number, config: HorarioComercialConfig): Date {
  if (!Number.isFinite(hours) || hours <= 0) return new Date(start.getTime());

  const inicioMin = parseTime(config.inicio);
  const fimMin = parseTime(config.fim);
  if (inicioMin === null || fimMin === null || fimMin <= inicioMin) return new Date(start.getTime());

  const diasUteis = new Set(config.diasUteis);
  const feriados = new Set(config.feriados);

  let restanteMs = hours * MS_PER_HOUR;
  const local = getZonedParts(start, config.timezone);
  const cursorBase = Date.UTC(local.year, local.month - 1, local.day);

  for (let offsetDia = 0; offsetDia < MAX_DIAS; offsetDia += 1) {
    const dia = new Date(cursorBase + offsetDia * MS_PER_DAY);
    const year = dia.getUTCFullYear();
    const month = dia.getUTCMonth() + 1;
    const day = dia.getUTCDate();
    const weekday = dia.getUTCDay();

    if (!diasUteis.has(weekday) || feriados.has(dateKey(year, month, day))) continue;

    const inicioJanela = zonedTimeToUtc(year, month, day, Math.floor(inicioMin / 60), inicioMin % 60, config.timezone);
    const fimJanela = zonedTimeToUtc(year, month, day, Math.floor(fimMin / 60), fimMin % 60, config.timezone);

    // A partir do instante de referência, só consome o que ainda resta da janela.
    const disponivelInicio = Math.max(inicioJanela.getTime(), start.getTime());
    if (disponivelInicio >= fimJanela.getTime()) continue;

    const disponivelMs = fimJanela.getTime() - disponivelInicio;
    if (disponivelMs >= restanteMs) {
      return new Date(disponivelInicio + restanteMs);
    }

    restanteMs -= disponivelMs;
  }

  // Fallback defensivo: configuração válida sempre resolve dentro de MAX_DIAS.
  return new Date(start.getTime() + hours * MS_PER_HOUR);
}
