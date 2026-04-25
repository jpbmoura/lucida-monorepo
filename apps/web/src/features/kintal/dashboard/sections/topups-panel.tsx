import type { KintalDashboardMetrics, TopupId } from "../types";
import { formatBrl, formatInt } from "../format";

interface TopupsPanelProps {
  data: KintalDashboardMetrics["topupsInPeriod"];
  windowLabel: string;
}

const PACKAGE_META: Record<
  TopupId,
  { name: string; tagline: string }
> = {
  topup_2k: { name: "Início", tagline: "2.000 créditos" },
  topup_5k: { name: "Plus", tagline: "5.000 créditos" },
  topup_15k: { name: "Power", tagline: "15.000 créditos" },
};

const ORDER: TopupId[] = ["topup_2k", "topup_5k", "topup_15k"];

// Gêmeo visual do SubscriptionsPanel. Número principal é a receita
// consolidada (grande, à direita do header); o mini-hint embaixo informa
// quantas compras compõem essa receita. Lista pacote-a-pacote embaixo
// mantém quantidade + receita lado a lado.
export function TopupsPanel({ data, windowLabel }: TopupsPanelProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Compras{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              avulsas
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Pacotes de créditos comprados no período.
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-medium leading-none tracking-tighter tabular-nums text-ink">
            {formatBrl(data.totalRevenueCents)}
          </div>
          <div className="mt-1.5 text-[11px] text-gray-400">
            {formatInt(data.totalCount)}{" "}
            {data.totalCount === 1 ? "compra" : "compras"} · {windowLabel}
          </div>
        </div>
      </div>

      <ul className="flex flex-col border-t border-gray-100">
        {ORDER.map((id) => {
          const agg = data.byPackage[id];
          const meta = PACKAGE_META[id];
          return (
            <li
              key={id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-gray-50 py-3.5 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium text-ink">
                  {meta.name}
                </span>
                <span className="text-[11px] text-gray-500">
                  {meta.tagline}
                </span>
              </div>
              <span className="min-w-[2.5rem] text-right text-base font-medium tabular-nums text-ink">
                {formatInt(agg.count)}
              </span>
              <span className="min-w-[6rem] text-right text-xs tabular-nums text-gray-500">
                {formatBrl(agg.revenueCents)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
