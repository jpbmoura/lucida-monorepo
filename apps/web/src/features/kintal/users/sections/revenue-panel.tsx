import { formatBrl, formatInt } from "@/features/kintal/dashboard/format";
import { PLAN_LABELS, STATUS_LABELS, type KintalBillingSummary } from "../types";

interface RevenuePanelProps {
  data: KintalBillingSummary;
}

// Painel "receita gerada" — LTV agregado + detalhe do plano atual.
// Mantém o estilo dos cards do dashboard (rounded-2xl, header com italic
// serif, valor grande à direita).
export function RevenuePanel({ data }: RevenuePanelProps) {
  const ltv = splitCurrency(data.lifetimeRevenueCents);
  const sub = data.currentSubscription;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Receita{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              gerada
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Soma de assinaturas e pacotes pagos pela conta.
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1 text-3xl font-medium leading-none tracking-tighter tabular-nums text-ink">
            {ltv.whole}
            {ltv.fraction && (
              <span className="text-base font-normal text-gray-400">
                {ltv.fraction}
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-gray-400">
            valor de vida (LTV)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 border-t border-gray-100 pt-5 md:grid-cols-3">
        <Stat
          label="Assinaturas pagas"
          value={formatBrl(data.lifetimeSubscriptionRevenueCents)}
          hint="ciclos cobrados"
        />
        <Stat
          label="Pacotes avulsos"
          value={formatBrl(data.lifetimeTopupsRevenueCents)}
          hint={`${formatInt(data.lifetimeTopupsCount)} ${data.lifetimeTopupsCount === 1 ? "compra" : "compras"}`}
        />
        <Stat
          label="Plano atual"
          value={sub ? PLAN_LABELS[sub.planId] ?? sub.planId : "—"}
          hint={
            sub
              ? buildSubHint(sub.status, sub.currentPeriodEnd, sub.cancelAtPeriodEnd)
              : "sem assinatura ativa"
          }
          accent={
            sub
              ? sub.cancelAtPeriodEnd
                ? "amber"
                : sub.status === "active"
                  ? "emerald"
                  : "amber"
              : "gray"
          }
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = "gray",
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "gray" | "emerald" | "amber";
}) {
  const dotClass =
    accent === "emerald"
      ? "bg-emerald-500"
      : accent === "amber"
        ? "bg-amber-500"
        : "bg-gray-300";

  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-gray-400">
        <span className={`size-1.5 rounded-full ${dotClass}`} />
        {label}
      </div>
      <div className="text-lg font-medium tabular-nums text-ink">{value}</div>
      <div className="text-xs text-gray-500">{hint}</div>
    </div>
  );
}

function buildSubHint(
  status: string,
  currentPeriodEnd: string,
  cancelAtPeriodEnd: boolean,
): string {
  const end = new Date(currentPeriodEnd);
  const dateLabel = end.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const days = Math.ceil(
    (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  if (cancelAtPeriodEnd) {
    return `cancela em ${dateLabel}${days > 0 ? ` · ${days}d restantes` : ""}`;
  }
  if (status === "active") {
    return days > 0
      ? `renova em ${dateLabel} · ${days}d`
      : `renova em ${dateLabel}`;
  }
  return STATUS_LABELS[status] ?? status;
}

function splitCurrency(cents: number): { whole: string; fraction: string } {
  const formatted = formatBrl(cents);
  const match = formatted.match(/^(.*)([,.]\d{2})$/);
  if (!match) return { whole: formatted, fraction: "" };
  return { whole: match[1]!.trim(), fraction: match[2]! };
}
