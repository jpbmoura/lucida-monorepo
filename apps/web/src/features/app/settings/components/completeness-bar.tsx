import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompletenessBar({ percent }: { percent: number }) {
  const complete = percent >= 100;
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border px-5 py-4",
        complete
          ? "border-emerald-100 bg-emerald-50/60"
          : "border-gray-100 bg-white",
      )}
    >
      <div className="flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-sm font-medium text-ink">
            {complete ? "Perfil completo" : "Perfil"}
          </div>
          <div className="text-xs font-medium tabular-nums text-gray-500">
            {percent}%
          </div>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              complete ? "bg-emerald-500" : "bg-brand-primary",
            )}
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
        <p className="mt-2 text-[12px] text-gray-500">
          {complete
            ? "Tudo preenchido — obrigado por contar um pouco sobre você."
            : "Quanto mais completo, melhor conseguimos ajustar o Lucida pra você."}
        </p>
      </div>
      {complete && (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="size-5" />
        </span>
      )}
    </div>
  );
}
