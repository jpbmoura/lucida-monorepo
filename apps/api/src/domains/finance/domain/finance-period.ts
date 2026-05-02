/**
 * Recorte calendarizado pro dashboard financeiro do Kintal — diferente do
 * `PeriodScope` rolling do dashboard geral. Aqui o operador escolhe um
 * período fechado ("Maio/2026", "T2 2026", "2026") porque a comparação
 * vs período anterior e a projeção só fazem sentido em recortes
 * calendarizados.
 *
 * Tudo em UTC pra bater com `createdAt` dos docs Mongo. Mês é 1-12 (não
 * 0-11 como Date).
 */
export type FinancePeriodKind = "month" | "quarter" | "year";

export interface FinancePeriodMonth {
  kind: "month";
  year: number;
  /** 1-12. */
  month: number;
}

export interface FinancePeriodQuarter {
  kind: "quarter";
  year: number;
  /** 1-4. */
  quarter: number;
}

export interface FinancePeriodYear {
  kind: "year";
  year: number;
}

export type FinancePeriod =
  | FinancePeriodMonth
  | FinancePeriodQuarter
  | FinancePeriodYear;

export interface PeriodRange {
  /** Inclusivo. */
  from: Date;
  /** Exclusivo. */
  to: Date;
}

export interface PeriodCompletion {
  /** % decorrido do período no instante `now`. 0 se ainda não começou,
   *  1 se já fechou. Útil pra projetar receita linearmente. */
  fraction: number;
  /** True se `now < to` (período em curso ou futuro). */
  isOpen: boolean;
  /** True se `now < from` — projeção inválida. */
  isFuture: boolean;
}

/** Intervalo `[from, to)` do período em UTC. */
export function resolveRange(period: FinancePeriod): PeriodRange {
  switch (period.kind) {
    case "month": {
      const from = new Date(Date.UTC(period.year, period.month - 1, 1));
      const to = new Date(Date.UTC(period.year, period.month, 1));
      return { from, to };
    }
    case "quarter": {
      const startMonth = (period.quarter - 1) * 3;
      const from = new Date(Date.UTC(period.year, startMonth, 1));
      const to = new Date(Date.UTC(period.year, startMonth + 3, 1));
      return { from, to };
    }
    case "year": {
      const from = new Date(Date.UTC(period.year, 0, 1));
      const to = new Date(Date.UTC(period.year + 1, 0, 1));
      return { from, to };
    }
  }
}

/** Período imediatamente anterior — base do comparativo. */
export function previousPeriod(period: FinancePeriod): FinancePeriod {
  switch (period.kind) {
    case "month": {
      if (period.month === 1) return { kind: "month", year: period.year - 1, month: 12 };
      return { kind: "month", year: period.year, month: period.month - 1 };
    }
    case "quarter": {
      if (period.quarter === 1) return { kind: "quarter", year: period.year - 1, quarter: 4 };
      return { kind: "quarter", year: period.year, quarter: period.quarter - 1 };
    }
    case "year":
      return { kind: "year", year: period.year - 1 };
  }
}

/**
 * Calcula completude do período em `now`. Usado pela projeção:
 * - `isFuture`: período ainda não começou — projeção = 0.
 * - `isOpen` && fraction > 0: extrapola receita atual / fraction.
 * - `!isOpen` (já fechou): sem projeção.
 */
export function periodCompletion(
  period: FinancePeriod,
  now: Date,
): PeriodCompletion {
  const { from, to } = resolveRange(period);
  if (now < from) return { fraction: 0, isOpen: true, isFuture: true };
  if (now >= to) return { fraction: 1, isOpen: false, isFuture: false };
  const total = to.getTime() - from.getTime();
  const elapsed = now.getTime() - from.getTime();
  return { fraction: elapsed / total, isOpen: true, isFuture: false };
}
