import { ArrowDown, Receipt } from "lucide-react";
import type { TeacherOverviewDTO } from "../data";

interface TeacherLedgerSectionProps {
  ledger: TeacherOverviewDTO["ledger"];
}

/**
 * Ledger individual do professor — só entries do pool institucional onde
 * ele foi o `actorUserId`. Diferente do ledger global da org (que mostra
 * também credit entries tipo `admin_grant`), este foca em **consumo**.
 */
export function TeacherLedgerSection({ ledger }: TeacherLedgerSectionProps) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-gray-50 text-gray-500">
          <Receipt className="size-4" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Consumo individual do pool
          </h2>
          <p className="text-xs text-gray-500">
            {ledger.length === 0
              ? "Nenhum consumo no período"
              : ledger.length === 1
                ? "1 lançamento"
                : `${ledger.length} lançamentos`}
          </p>
        </div>
      </header>

      {ledger.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-8 text-center text-sm text-gray-500">
          Sem consumo do pool nesse período.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100">
          {ledger.map((it) => (
            <li key={it.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-600">
                <ArrowDown className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {describeReason(it.reason, it.relatedAction)}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {formatRelative(it.createdAt)}
                </div>
              </div>
              <div className="shrink-0 text-right tabular-nums text-sm font-medium text-ink">
                −{it.amount.toLocaleString("pt-BR")}
                <span className="ml-1 text-[11px] font-normal text-gray-400">
                  créditos
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function describeReason(reason: string, relatedAction: string | null): string {
  if (reason === "ai_consumption") {
    if (relatedAction === "generate_exam") return "Geração de prova";
    if (relatedAction === "regenerate_question") return "Regeração de questão";
    return "Consumo de IA";
  }
  return reason;
}

function formatRelative(iso: string): string {
  const then = new Date(iso);
  const diffMin = Math.floor((Date.now() - then.getTime()) / (1000 * 60));
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin} min atrás`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
  }).format(then);
}
