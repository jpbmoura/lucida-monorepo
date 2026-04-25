import { ArrowDown, ArrowUp, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgBillingDTO } from "../data";

interface OrgLedgerSectionProps {
  ledger: OrgBillingDTO["ledger"];
}

export function OrgLedgerSection({ ledger }: OrgLedgerSectionProps) {
  if (ledger.items.length === 0) {
    return (
      <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6">
        <header className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-gray-50 text-gray-500">
            <Receipt className="size-4" />
          </span>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Movimentação de créditos
            </h2>
            <p className="text-xs text-gray-500">
              Ainda sem lançamentos — carregar créditos na instituição faz
              a primeira entry aparecer aqui.
            </p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6">
      <header className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-gray-50 text-gray-500">
            <Receipt className="size-4" />
          </span>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Movimentação de créditos
            </h2>
            <p className="text-xs text-gray-500">
              Últimos {ledger.items.length}{" "}
              {ledger.items.length === 1 ? "lançamento" : "lançamentos"}
            </p>
          </div>
        </div>
      </header>

      <ul className="flex flex-col divide-y divide-gray-100">
        {ledger.items.map((it) => (
          <li key={it.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            <div
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full",
                it.type === "credit"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-gray-100 text-gray-600",
              )}
            >
              {it.type === "credit" ? (
                <ArrowUp className="size-3.5" />
              ) : (
                <ArrowDown className="size-3.5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink">
                {describeReason(it.reason, it.relatedAction)}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                {it.actorName ? `${it.actorName} · ` : ""}
                {formatRelative(it.createdAt)}
              </div>
            </div>
            <div
              className={cn(
                "shrink-0 text-right tabular-nums text-sm font-medium",
                it.type === "credit" ? "text-emerald-700" : "text-ink",
              )}
            >
              {it.type === "credit" ? "+" : "−"}
              {it.amount.toLocaleString("pt-BR")}
              <span className="ml-1 text-[11px] font-normal text-gray-400">
                créditos
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function describeReason(
  reason: string,
  relatedAction: string | null,
): string {
  const actionLabel =
    relatedAction === "generate_exam"
      ? "geração de prova"
      : relatedAction === "regenerate_question"
        ? "regeração de questão"
        : null;

  switch (reason) {
    case "admin_grant":
      return "Créditos adicionados pela administração";
    case "ai_consumption":
      return actionLabel ? `Consumo — ${actionLabel}` : "Consumo de IA";
    case "expiration":
      return "Créditos expirados";
    case "refund":
      return "Estorno";
    case "adjustment":
      return "Ajuste manual";
    case "subscription_renewal":
      return "Renovação de assinatura";
    case "topup_purchase":
      return "Compra de créditos avulsos";
    case "promo_grant":
      return "Bônus promocional";
    case "welcome_bonus":
      return "Bônus de boas-vindas";
    default:
      return reason;
  }
}

function formatRelative(iso: string): string {
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
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
