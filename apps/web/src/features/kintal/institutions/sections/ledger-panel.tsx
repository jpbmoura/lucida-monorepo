import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KintalInstitutionLedgerEntry } from "../types";

export function LedgerPanel({
  entries,
}: {
  entries: KintalInstitutionLedgerEntry[];
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6">
      <header className="pb-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
          Auditoria
        </div>
        <h2 className="mt-1 text-xl font-medium tracking-tight text-ink">
          Últimos lançamentos
        </h2>
      </header>

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum lançamento ainda.</p>
      ) : (
        <ul>
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className={cn(
                "flex items-center gap-3 py-3",
                i < entries.length - 1 && "border-b border-gray-50",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-md",
                  entry.type === "credit"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-50 text-gray-500",
                )}
              >
                {entry.type === "credit" ? (
                  <ArrowDownLeft className="size-4" />
                ) : (
                  <ArrowUpRight className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink">
                  {reasonLabel(entry.reason)}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-gray-500">
                  {entry.walletSource}
                  {entry.relatedAction && ` · ${entry.relatedAction}`}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    entry.type === "credit" ? "text-emerald-700" : "text-ink",
                  )}
                >
                  {entry.type === "credit" ? "+" : "−"}
                  {entry.amount.toLocaleString("pt-BR")}
                </div>
                <div className="text-[10px] text-gray-400">
                  {new Date(entry.createdAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case "welcome_bonus":
      return "Bônus de boas-vindas";
    case "subscription_renewal":
      return "Renovação de assinatura";
    case "topup_purchase":
      return "Compra de créditos";
    case "promo_grant":
      return "Crédito promocional";
    case "ai_consumption":
      return "Uso de IA";
    case "expiration":
      return "Expiração";
    case "refund":
      return "Reembolso";
    case "adjustment":
      return "Ajuste manual";
    case "admin_grant":
      return "Crédito administrativo";
    default:
      return reason;
  }
}
