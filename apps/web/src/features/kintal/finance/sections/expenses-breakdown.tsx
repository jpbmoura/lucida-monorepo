import { formatBrl } from "@/features/kintal/dashboard/format";
import {
  CATEGORY_LABELS,
  TRANSACTION_COST_CATEGORIES,
  type CategoryBreakdownItem,
  type FinancialSummary,
} from "../types";

interface ExpensesBreakdownProps {
  summary: FinancialSummary;
}

// Tabela compacta com despesas por categoria. Categorias zeradas ficam
// em estilo desbotado pra dar a visão completa do "guarda-roupa" sem
// sumir slot quando entra/sai categoria.
export function ExpensesBreakdown({ summary }: ExpensesBreakdownProps) {
  const total = summary.current.expensesCents;
  const items = [...summary.expensesByCategory].sort(
    (a, b) => b.totalCents - a.totalCents,
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Gastos por{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              categoria
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Custos de transação abatem o líquido; operacionais entram só em
            gastos.
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-medium leading-none tracking-tighter tabular-nums text-ink">
            {formatBrl(total)}
          </div>
          <div className="mt-1 text-[11px] text-gray-400">total no período</div>
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-xl bg-gray-50 px-5 py-8 text-center text-xs text-gray-400">
          Nenhuma despesa lançada nesse período.
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {items.map((it) => (
            <Row key={it.category} item={it} total={total} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  item,
  total,
}: {
  item: CategoryBreakdownItem;
  total: number;
}) {
  const pct = total > 0 ? (item.totalCents / total) * 100 : 0;
  const isZero = item.totalCents === 0;
  const isTransactionCost = TRANSACTION_COST_CATEGORIES.has(item.category);

  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="flex flex-1 items-center gap-3">
        <span
          className={`size-2 rounded-full ${
            isTransactionCost ? "bg-amber-400" : "bg-gray-300"
          }`}
          aria-hidden
        />
        <span
          className={`text-sm ${
            isZero ? "text-gray-300" : "font-medium text-ink"
          }`}
        >
          {CATEGORY_LABELS[item.category]}
        </span>
        {isTransactionCost && (
          <span className="rounded-pill bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700">
            abate líquido
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`tabular-nums ${
            isZero ? "text-gray-300" : "text-ink"
          } text-sm font-medium`}
        >
          {formatBrl(item.totalCents)}
        </span>
        <span className="w-12 text-right text-[11px] tabular-nums text-gray-400">
          {pct.toFixed(0)}%
        </span>
      </div>
    </li>
  );
}
