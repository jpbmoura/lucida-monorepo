import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatInt } from "@/features/kintal/dashboard/format";
import {
  REASON_LABELS,
  SOURCE_LABELS,
  type KintalLedgerEntry,
} from "../types";

interface LedgerListProps {
  entries: KintalLedgerEntry[];
}

// Extrato: timeline densa, mais recente primeiro. Crédito = verde com seta
// pra cima; débito = neutro com seta pra baixo. Mostra reason em destaque
// e fonte/wallet como secundário.
export function LedgerList({ entries }: LedgerListProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white">
      <header className="flex items-baseline justify-between border-b border-gray-100 px-7 py-6">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Extrato{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              recente
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Últimos {entries.length} lançamentos da carteira pessoal.
          </p>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-7 py-16 text-center">
          <p className="text-sm font-medium text-ink">
            Nada pra mostrar ainda.
          </p>
          <p className="max-w-sm text-[13px] text-gray-500">
            Lançamentos aparecem aqui quando o user receber créditos ou
            consumir IA.
          </p>
        </div>
      ) : (
        <ul>
          {entries.map((e, i) => (
            <li
              key={e.id}
              className={
                i < entries.length - 1 ? "border-b border-gray-50" : undefined
              }
            >
              <LedgerRow entry={e} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LedgerRow({ entry }: { entry: KintalLedgerEntry }) {
  const isCredit = entry.type === "credit";
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-7 py-3.5">
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          isCredit
            ? "bg-emerald-50 text-emerald-600"
            : "bg-gray-50 text-gray-500",
        )}
      >
        {isCredit ? (
          <ArrowUpRight className="size-3.5" />
        ) : (
          <ArrowDownRight className="size-3.5" />
        )}
      </span>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2 truncate">
          <span className="truncate text-sm font-medium text-ink">
            {REASON_LABELS[entry.reason] ?? entry.reason}
          </span>
          <span className="shrink-0 text-[11px] text-gray-400">
            {SOURCE_LABELS[entry.walletSource] ?? entry.walletSource}
          </span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-2 text-[11px] text-gray-500">
          <span>{formatRelative(entry.createdAt)}</span>
          {entry.relatedAction && (
            <>
              <span className="text-gray-300">·</span>
              <code className="text-[10px]">{entry.relatedAction}</code>
            </>
          )}
          {entry.tokensUsed !== null && entry.tokensUsed > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span>{formatInt(entry.tokensUsed)} tokens</span>
            </>
          )}
        </div>
      </div>

      <div className="text-right">
        <div
          className={cn(
            "text-sm font-medium tabular-nums",
            isCredit ? "text-emerald-700" : "text-ink",
          )}
        >
          {isCredit ? "+" : "−"}
          {formatInt(entry.amount)}
        </div>
        <div className="text-[10px] uppercase tracking-[0.08em] text-gray-400">
          créditos
        </div>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}
