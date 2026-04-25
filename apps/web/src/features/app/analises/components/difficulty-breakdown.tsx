import { cn } from "@/lib/utils";
import type { DifficultyKey, DifficultyStat } from "../data";

/**
 * Mostra acerto em fácil/médio/difícil como 3 barras horizontais.
 * Opcionalmente sobrepõe uma "accuracy de referência" (ex.: média da turma)
 * pra comparação — usado na página do aluno.
 */
export function DifficultyBreakdown({
  items,
  referenceLabel,
}: {
  items: Array<DifficultyStat & { classAccuracy?: number | null }>;
  referenceLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <DifficultyBar
          key={item.difficulty}
          difficulty={item.difficulty}
          accuracy={item.accuracy}
          referenceAccuracy={item.classAccuracy ?? null}
          totalQuestions={item.totalQuestions}
          correctCount={item.correctCount}
          referenceLabel={referenceLabel}
        />
      ))}
    </div>
  );
}

function DifficultyBar({
  difficulty,
  accuracy,
  totalQuestions,
  correctCount,
  referenceAccuracy,
  referenceLabel,
}: {
  difficulty: DifficultyKey;
  accuracy: number | null;
  totalQuestions: number;
  correctCount: number;
  referenceAccuracy: number | null;
  referenceLabel?: string;
}) {
  const pct = accuracy ?? 0;
  const refPct = referenceAccuracy ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium capitalize text-ink">{difficulty}</span>
        {accuracy === null ? (
          <span className="text-gray-400">sem dados</span>
        ) : (
          <span className="tabular-nums text-gray-500">
            <span className={cn("font-semibold", toneText(accuracy))}>
              {accuracy}%
            </span>
            <span className="ml-1 text-[11px] text-gray-400">
              · {correctCount}/{totalQuestions}
            </span>
          </span>
        )}
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn("h-full rounded-full transition-all", toneBg(pct))}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
        {refPct !== null && (
          <div
            aria-label={`${referenceLabel ?? "Referência"}: ${refPct}%`}
            className="absolute top-0 bottom-0 w-px bg-ink/70"
            style={{ left: `${Math.min(100, refPct)}%` }}
            title={`${referenceLabel ?? "Referência"}: ${refPct}%`}
          />
        )}
      </div>

      {refPct !== null && referenceLabel && (
        <div className="text-[10px] text-gray-400">
          Linha escura = {referenceLabel} ({refPct}%)
        </div>
      )}
    </div>
  );
}

function toneText(pct: number): string {
  if (pct >= 80) return "text-emerald-700";
  if (pct >= 60) return "text-amber-700";
  return "text-red-700";
}

function toneBg(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-400";
  return "bg-red-400";
}
