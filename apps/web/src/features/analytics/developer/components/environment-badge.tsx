import { cn } from "@/lib/utils";
import type { ApiKeyEnvironment } from "../data";

/**
 * Distintivo visual de `live` vs `test`. Test usa tom neutro (cinza)
 * porque não deve "brilhar" na UI — é dev-first. Live tem o roxo do
 * produto pra reforçar "isso é produção".
 */
export function EnvironmentBadge({
  environment,
  className,
}: {
  environment: ApiKeyEnvironment;
  className?: string;
}) {
  if (environment === "live") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-analytics-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-analytics-primary",
          className,
        )}
      >
        <span className="size-1.5 rounded-full bg-analytics-primary" />
        Live
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-gray-400" />
      Test
    </span>
  );
}
