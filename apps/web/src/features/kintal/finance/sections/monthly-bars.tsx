import { formatBrl } from "@/features/kintal/dashboard/format";
import { monthShort } from "../period";
import type { FinancialSummary } from "../types";

interface MonthlyBarsProps {
  summary: FinancialSummary;
}

// Gráfico de barras simples (CSS only) com receita e gastos lado a lado
// pra cada mês do range. Sem libs — barras escaladas pelo maior valor
// observado.
export function MonthlyBars({ summary }: MonthlyBarsProps) {
  const buckets = summary.monthly;
  if (buckets.length <= 1) return null;

  const max = Math.max(
    1,
    ...buckets.flatMap((b) => [b.grossRevenueCents, b.expensesCents]),
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Mês a{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">mês</span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Receita bruta e gastos dentro do período.
          </p>
        </div>
        <Legend />
      </div>

      <div className="grid grid-cols-12 items-end gap-2 sm:gap-4">
        {buckets.map((b) => {
          const revH = (b.grossRevenueCents / max) * 100;
          const expH = (b.expensesCents / max) * 100;
          return (
            <div
              key={b.month}
              className="flex flex-col items-center gap-2"
              style={{ gridColumn: `span ${Math.max(1, Math.floor(12 / buckets.length))}` }}
            >
              <div className="flex h-44 w-full items-end justify-center gap-1">
                <Bar
                  heightPct={revH}
                  toneClass="bg-ink"
                  title={`Bruto · ${formatBrl(b.grossRevenueCents)}`}
                />
                <Bar
                  heightPct={expH}
                  toneClass="bg-rose-300"
                  title={`Gastos · ${formatBrl(b.expensesCents)}`}
                />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-gray-400">
                {monthShort(b.month)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bar({
  heightPct,
  toneClass,
  title,
}: {
  heightPct: number;
  toneClass: string;
  title: string;
}) {
  // Garante 1px mínimo pra dar feedback visual mesmo quando há R$0,01.
  const height = Math.max(heightPct === 0 ? 0 : 1, heightPct);
  return (
    <div
      className={`w-3 rounded-t-md ${toneClass} transition-opacity hover:opacity-80`}
      style={{ height: `${height}%` }}
      title={title}
    />
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[11px] text-gray-500">
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-ink" />
        Bruto
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-rose-300" />
        Gastos
      </div>
    </div>
  );
}
