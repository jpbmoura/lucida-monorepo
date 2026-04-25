export type PeriodScope = "today" | "7d" | "30d" | "90d";

export const PERIOD_SCOPES: readonly PeriodScope[] = [
  "today",
  "7d",
  "30d",
  "90d",
] as const;

/**
 * Converte o scope em intervalo `[from, to)`. `to` é sempre "agora" — a
 * janela é sempre relativa, rolling. "today" é início do dia local (usamos
 * UTC pra consistência com os timestamps do Mongo).
 */
export function resolvePeriod(scope: PeriodScope, now: Date = new Date()): {
  from: Date;
  to: Date;
} {
  const to = new Date(now);
  const from = new Date(now);

  switch (scope) {
    case "today": {
      from.setUTCHours(0, 0, 0, 0);
      break;
    }
    case "7d": {
      from.setUTCDate(from.getUTCDate() - 7);
      break;
    }
    case "30d": {
      from.setUTCDate(from.getUTCDate() - 30);
      break;
    }
    case "90d": {
      from.setUTCDate(from.getUTCDate() - 90);
      break;
    }
  }

  return { from, to };
}
