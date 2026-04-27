import { CheckCircle2, MinusCircle, Pause, AlertCircle } from "lucide-react";
import {
  PLAN_LABELS,
  STATUS_LABELS,
  type KintalSubscriptionHistoryItem,
} from "../types";

interface SubscriptionsHistoryProps {
  items: KintalSubscriptionHistoryItem[];
}

export function SubscriptionsHistory({ items }: SubscriptionsHistoryProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white">
        <header className="border-b border-gray-100 px-7 py-6">
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Histórico de{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              assinaturas
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Ainda não houve nenhuma assinatura nessa conta.
          </p>
        </header>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white">
      <header className="flex items-baseline justify-between border-b border-gray-100 px-7 py-6">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Histórico de{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              assinaturas
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {items.length} {items.length === 1 ? "registro" : "registros"} —
            mais recente primeiro.
          </p>
        </div>
      </header>
      <ul>
        {items.map((s, i) => (
          <li
            key={s.id}
            className={
              i < items.length - 1 ? "border-b border-gray-50" : undefined
            }
          >
            <SubscriptionRow item={s} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SubscriptionRow({
  item,
}: {
  item: KintalSubscriptionHistoryItem;
}) {
  const tone = toneFor(item.status);

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-7 py-4">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full ${tone.iconBg}`}
      >
        <tone.Icon className={`size-4 ${tone.iconColor}`} />
      </span>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium text-ink">
            {PLAN_LABELS[item.planId] ?? item.planId}
          </span>
          <span
            className={`shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${tone.badgeClass}`}
          >
            {STATUS_LABELS[item.status] ?? item.status}
          </span>
          {item.cancelAtPeriodEnd && item.status !== "canceled" && (
            <span className="shrink-0 rounded-pill bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-amber-700">
              cancela ao fim do ciclo
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-gray-500">
          {fmtDate(item.createdAt)} → {fmtDate(item.currentPeriodEnd)}
          {item.canceledAt && (
            <span> · cancelada em {fmtDate(item.canceledAt)}</span>
          )}
        </div>
      </div>

      <code className="hidden text-[10px] text-gray-400 sm:block">
        {item.id.slice(0, 8)}
      </code>
    </div>
  );
}

function toneFor(status: string) {
  switch (status) {
    case "active":
      return {
        Icon: CheckCircle2,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        badgeClass: "bg-emerald-50 text-emerald-700",
      };
    case "past_due":
      return {
        Icon: AlertCircle,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        badgeClass: "bg-amber-50 text-amber-700",
      };
    case "paused":
      return {
        Icon: Pause,
        iconBg: "bg-gray-50",
        iconColor: "text-gray-500",
        badgeClass: "bg-gray-100 text-gray-600",
      };
    default:
      return {
        Icon: MinusCircle,
        iconBg: "bg-gray-50",
        iconColor: "text-gray-400",
        badgeClass: "bg-gray-100 text-gray-500",
      };
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}
