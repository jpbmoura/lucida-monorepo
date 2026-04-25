/**
 * Tipos compartilhados entre os use cases de analytics (class/student/exam).
 * Mantidos separados pra evitar dependência cruzada entre os arquivos.
 */

export type OverviewPeriod = "7d" | "30d" | "90d" | "all";

export type DifficultyKey = "fácil" | "médio" | "difícil";

export interface DifficultyStat {
  difficulty: DifficultyKey;
  totalQuestions: number;
  correctCount: number;
  /** 0..100 — null quando não há questões dessa dificuldade respondidas. */
  accuracy: number | null;
}

export interface ScoreDistributionBucket {
  range: string;
  count: number;
}

// Em segundos — mesma constante do overview; usada pra estimar tempo economizado
// em corrigir por aluno/prova (não está exposta em class/student/exam hoje mas
// deixo o export pra reaproveitar no futuro).
export const SECONDS_SAVED_PER_QUESTION = 30;

export function resolvePeriodStart(
  period: OverviewPeriod,
  now: Date,
): Date | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d;
}

export function round1(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Math.round(value * 10) / 10;
}

export function buildDistribution(
  scores: number[],
): ScoreDistributionBucket[] {
  const buckets = Array.from({ length: 10 }, () => 0);
  for (const s of scores) {
    if (!Number.isFinite(s)) continue;
    const idx = Math.min(9, Math.max(0, Math.floor(s)));
    buckets[idx] = (buckets[idx] ?? 0) + 1;
  }
  return buckets.map((count, i) => ({ range: `${i}-${i + 1}`, count }));
}
