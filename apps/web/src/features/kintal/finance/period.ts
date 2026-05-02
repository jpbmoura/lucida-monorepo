import type { FinancePeriod, FinancePeriodKind } from "./types";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTH_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

export function monthShort(month: number): string {
  return MONTH_SHORT[month - 1] ?? String(month);
}

export function periodLabel(period: FinancePeriod): string {
  switch (period.kind) {
    case "month":
      return `${monthName(period.month)} de ${period.year}`;
    case "quarter":
      return `${period.quarter}º trimestre de ${period.year}`;
    case "year":
      return `${period.year}`;
  }
}

export function previousPeriod(period: FinancePeriod): FinancePeriod {
  switch (period.kind) {
    case "month":
      if (period.month === 1) return { kind: "month", year: period.year - 1, month: 12 };
      return { kind: "month", year: period.year, month: period.month - 1 };
    case "quarter":
      if (period.quarter === 1) return { kind: "quarter", year: period.year - 1, quarter: 4 };
      return { kind: "quarter", year: period.year, quarter: period.quarter - 1 };
    case "year":
      return { kind: "year", year: period.year - 1 };
  }
}

export function previousPeriodLabel(period: FinancePeriod): string {
  return periodLabel(previousPeriod(period));
}

export function currentPeriod(kind: FinancePeriodKind, now: Date = new Date()): FinancePeriod {
  const year = now.getUTCFullYear();
  if (kind === "year") return { kind: "year", year };
  if (kind === "quarter") {
    const q = Math.floor(now.getUTCMonth() / 3) + 1;
    return { kind: "quarter", year, quarter: q };
  }
  return { kind: "month", year, month: now.getUTCMonth() + 1 };
}

/** Serializa pra query string flat: `kind=month&year=2026&month=5`. */
export function periodToSearchParams(period: FinancePeriod): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set("kind", period.kind);
  sp.set("year", String(period.year));
  if (period.kind === "month") sp.set("month", String(period.month));
  if (period.kind === "quarter") sp.set("quarter", String(period.quarter));
  return sp;
}

/** Lê period dos searchParams; default = mês atual. */
export function periodFromSearchParams(
  raw: Record<string, string | string[] | undefined>,
): FinancePeriod {
  const kind = pickStr(raw.kind);
  const year = pickInt(raw.year);
  const month = pickInt(raw.month);
  const quarter = pickInt(raw.quarter);
  if (kind === "month" && year && month && month >= 1 && month <= 12) {
    return { kind: "month", year, month };
  }
  if (kind === "quarter" && year && quarter && quarter >= 1 && quarter <= 4) {
    return { kind: "quarter", year, quarter };
  }
  if (kind === "year" && year) return { kind: "year", year };
  return currentPeriod("month");
}

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
function pickInt(v: string | string[] | undefined): number | undefined {
  const raw = pickStr(v);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
