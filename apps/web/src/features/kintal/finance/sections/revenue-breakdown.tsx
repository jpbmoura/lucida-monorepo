import { formatBrl } from "@/features/kintal/dashboard/format";
import type { FinancialSummary } from "../types";

interface RevenueBreakdownProps {
  summary: FinancialSummary;
}

// Painel mostrando como o bruto se decompõe em assinaturas vs top-ups.
// Barra horizontal proporcional + métricas. Mesma vibe do
// `subscriptions-panel` do dashboard.
export function RevenueBreakdown({ summary }: RevenueBreakdownProps) {
  const { current } = summary;
  const total = current.grossRevenueCents;
  const subsPct = total > 0 ? (current.subscriptionsCents / total) * 100 : 0;
  const topupsPct = total > 0 ? (current.topupsCents / total) * 100 : 0;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Origem da{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              receita
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Assinaturas vs compras avulsas (top-ups).
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-medium leading-none tracking-tighter tabular-nums text-ink">
            {formatBrl(total)}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">bruto no período</div>
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-xl bg-gray-50 px-5 py-8 text-center text-xs text-gray-400">
          Nenhuma receita registrada nesse período.
        </div>
      ) : (
        <>
          {/* Barra empilhada */}
          <div className="mb-5 flex h-2.5 w-full overflow-hidden rounded-pill bg-gray-100">
            <div
              className="bg-ink"
              style={{ width: `${subsPct}%` }}
              aria-label="Assinaturas"
            />
            <div
              className="bg-gray-300"
              style={{ width: `${topupsPct}%` }}
              aria-label="Top-ups"
            />
          </div>

          <div className="grid grid-cols-2 gap-5 border-t border-gray-100 pt-5">
            <Block
              label="Assinaturas"
              dotClass="bg-ink"
              valueCents={current.subscriptionsCents}
              pct={subsPct}
            />
            <Block
              label="Top-ups"
              dotClass="bg-gray-300"
              valueCents={current.topupsCents}
              pct={topupsPct}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Block({
  label,
  dotClass,
  valueCents,
  pct,
}: {
  label: string;
  dotClass: string;
  valueCents: number;
  pct: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`size-2.5 rounded-full ${dotClass}`} />
        <span className="text-sm font-medium text-ink">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-medium tracking-tighter tabular-nums text-ink">
          {formatBrl(valueCents)}
        </span>
        <span className="text-xs text-gray-400 tabular-nums">
          {pct.toFixed(1).replace(".", ",")}%
        </span>
      </div>
    </div>
  );
}
