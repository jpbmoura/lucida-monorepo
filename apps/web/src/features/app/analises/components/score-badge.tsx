import { cn } from "@/lib/utils";

/**
 * Badge colorido da nota (0..10). Verde >= 8, âmbar 6-8, vermelho < 6.
 * Reusado em rankings e tabelas do analytics.
 */
export function ScoreBadge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md";
}) {
  const tone =
    score >= 8
      ? "bg-emerald-50 text-emerald-700"
      : score >= 6
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold tabular-nums",
        size === "sm"
          ? "min-w-12 px-2 py-0.5 text-xs"
          : "min-w-14 px-2 py-1 text-sm",
        tone,
      )}
    >
      {score.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
    </span>
  );
}
