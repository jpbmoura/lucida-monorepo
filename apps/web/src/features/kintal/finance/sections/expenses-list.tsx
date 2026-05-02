import { formatBrl } from "@/features/kintal/dashboard/format";
import {
  CATEGORY_LABELS,
  TRANSACTION_COST_CATEGORIES,
  type ExpenseDto,
} from "../types";
import { ExpenseRowActions } from "../components/expense-row-actions";
import { ExpenseFormDialog } from "../components/expense-form-dialog";

interface ExpensesListProps {
  expenses: ExpenseDto[];
  /** Default `occurredAt` pro form — passado pelo server pra evitar TZ drift. */
  defaultOccurredAt: string;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: "America/Sao_Paulo",
});

// Lista de despesas do período. Server-rendered; cada linha tem actions
// client (delete inline). Form de criação convive no header.
export function ExpensesList({ expenses, defaultOccurredAt }: ExpensesListProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Despesas{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              do período
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Lançamentos manuais. Apague e relance quando precisar corrigir.
          </p>
        </div>
        <ExpenseFormDialog defaultOccurredAt={defaultOccurredAt} />
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-xl bg-gray-50 px-5 py-10 text-center text-xs text-gray-400">
          Nenhuma despesa nesse período. Use “Lançar despesa” pra começar.
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {expenses.map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-3"
            >
              <span className="w-14 shrink-0 text-[11px] tabular-nums text-gray-400">
                {dateFormatter.format(new Date(e.occurredAt))}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">
                  {e.description}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                  {CATEGORY_LABELS[e.category]}
                  {TRANSACTION_COST_CATEGORIES.has(e.category) && (
                    <span className="rounded-pill bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-700">
                      abate líquido
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium tabular-nums text-ink">
                {formatBrl(e.amountCents)}
              </span>
              <ExpenseRowActions
                expenseId={e.id}
                description={e.description}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
