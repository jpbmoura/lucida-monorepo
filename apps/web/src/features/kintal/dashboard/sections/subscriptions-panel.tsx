import type { KintalDashboardMetrics } from "../types";
import { formatInt } from "../format";

interface SubscriptionsPanelProps {
  data: KintalDashboardMetrics["activeSubscriptions"];
  newSubscribers: number;
  windowLabel: string;
}

// Painel estilo Exam/Analytics: rounded-2xl, border cinza, p-7, header com
// destaque tipográfico em italic serif, subtítulo explicativo. O total
// ativo é snapshot; o "+N novos no período" absorve a métrica de novos
// assinantes sem exigir um card extra.
export function SubscriptionsPanel({
  data,
  newSubscribers,
  windowLabel,
}: SubscriptionsPanelProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Assinaturas{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              ativas
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Distribuição por plano e ciclo — snapshot atual.
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-medium leading-none tracking-tighter tabular-nums text-ink">
            {formatInt(data.total)}
          </div>
          <div className="mt-1.5 text-[11px] text-gray-400">
            +{formatInt(newSubscribers)} {newSubscribers === 1 ? "nova" : "novas"} · {windowLabel}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 border-t border-gray-100 pt-5">
        <TierBlock
          name="Básico"
          total={data.basic.total}
          monthly={data.basic.monthly}
          yearly={data.basic.yearly}
        />
        <TierBlock
          name="Pro"
          total={data.pro.total}
          monthly={data.pro.monthly}
          yearly={data.pro.yearly}
        />
      </div>
    </div>
  );
}

function TierBlock({
  name,
  total,
  monthly,
  yearly,
}: {
  name: string;
  total: number;
  monthly: number;
  yearly: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{name}</span>
        <span className="text-2xl font-medium tracking-tighter tabular-nums text-ink">
          {formatInt(total)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 border-t border-gray-50 pt-2.5 text-xs">
        <Row label="Mensal" value={monthly} />
        <Row label="Anual" value={yearly} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium tabular-nums text-gray-700">
        {formatInt(value)}
      </span>
    </div>
  );
}
