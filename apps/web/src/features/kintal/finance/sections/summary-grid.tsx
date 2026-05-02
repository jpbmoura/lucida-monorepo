import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Receipt,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBrl } from "@/features/kintal/dashboard/format";
import type { FinancialSummary } from "../types";
import { previousPeriodLabel } from "../period";

interface SummaryGridProps {
  summary: FinancialSummary;
}

interface SummaryCard {
  label: string;
  valueCents: number;
  previousCents: number;
  deltaPct: number | null;
  icon: LucideIcon;
  hint: string;
  /** Pra "gastos", crescer é ruim — inverte a polarização do delta. */
  invertDelta?: boolean;
  featured?: boolean;
}

// 3 KPIs grandes no topo: Bruto, Líquido, Gastos. Mesmo shape do KPI grid
// do dashboard — bg-gray-100 entre células dá o divisor; o "featured"
// (bruto) ganha bg-ink. Cada card mostra valor atual, delta % vs período
// anterior e o valor anterior em texto secundário.
export function SummaryGrid({ summary }: SummaryGridProps) {
  const prevLabel = previousPeriodLabel(summary.period);

  const cards: SummaryCard[] = [
    {
      label: "Faturamento bruto",
      valueCents: summary.current.grossRevenueCents,
      previousCents: summary.previous.grossRevenueCents,
      deltaPct: summary.delta.grossRevenuePct,
      icon: Banknote,
      hint: "tudo que entrou",
      featured: true,
    },
    {
      label: "Faturamento líquido",
      valueCents: summary.current.netRevenueCents,
      previousCents: summary.previous.netRevenueCents,
      deltaPct: summary.delta.netRevenuePct,
      icon: Receipt,
      hint: "bruto − taxas e impostos",
    },
    {
      label: "Gastos",
      valueCents: summary.current.expensesCents,
      previousCents: summary.previous.expensesCents,
      deltaPct: summary.delta.expensesPct,
      icon: TrendingDown,
      hint: "todas as despesas",
      invertDelta: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 sm:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} card={card} previousLabel={prevLabel} />
      ))}
    </div>
  );
}

function Card({
  card,
  previousLabel,
}: {
  card: SummaryCard;
  previousLabel: string;
}) {
  const Icon = card.icon;
  const featured = Boolean(card.featured);
  const value = splitCurrency(card.valueCents);

  return (
    <div
      className={cn(
        "flex flex-col gap-[18px] p-7 transition-colors",
        featured ? "bg-ink text-white" : "bg-white hover:bg-gray-50",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-[0.08em]",
            featured ? "text-white/60" : "text-gray-500",
          )}
        >
          {card.label}
        </span>
        <span
          className={cn(
            "grid size-7 place-items-center rounded-lg",
            featured ? "bg-white/10 text-white" : "bg-gray-50 text-gray-500",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>

      <div
        className={cn(
          "flex items-baseline gap-1 text-[2.75rem] font-medium leading-none tracking-tighter tabular-nums",
          featured ? "text-white" : "text-ink",
        )}
      >
        {value.whole}
        {value.fraction && (
          <span
            className={cn(
              "text-lg font-normal",
              featured ? "text-white/40" : "text-gray-400",
            )}
          >
            {value.fraction}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <DeltaRow
          deltaPct={card.deltaPct}
          invertDelta={Boolean(card.invertDelta)}
          featured={featured}
        />
        <div
          className={cn(
            "text-[11px]",
            featured ? "text-white/40" : "text-gray-400",
          )}
        >
          {card.hint} · {formatBrl(card.previousCents)} em {previousLabel}
        </div>
      </div>
    </div>
  );
}

function DeltaRow({
  deltaPct,
  invertDelta,
  featured,
}: {
  deltaPct: number | null;
  invertDelta: boolean;
  featured: boolean;
}) {
  if (deltaPct === null) {
    return (
      <span
        className={cn(
          "text-[11px]",
          featured ? "text-white/50" : "text-gray-400",
        )}
      >
        — sem comparação
      </span>
    );
  }
  const positive = deltaPct >= 0;
  // Cor: verde quando "bom", vermelho quando "ruim". Pra gastos, crescer
  // é ruim (invertDelta=true).
  const isGood = invertDelta ? !positive : positive;
  const Arrow = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12px] font-medium tabular-nums",
        featured
          ? isGood
            ? "text-emerald-300"
            : "text-rose-300"
          : isGood
            ? "text-emerald-600"
            : "text-rose-600",
      )}
    >
      <Arrow className="size-3" />
      {Math.abs(deltaPct).toFixed(deltaPct >= 100 ? 0 : 1).replace(".", ",")}%
    </span>
  );
}

function splitCurrency(cents: number): { whole: string; fraction: string } {
  const formatted = formatBrl(cents);
  const match = formatted.match(/^(.*)([,.]\d{2})$/);
  if (!match) return { whole: formatted, fraction: "" };
  return { whole: match[1]!.trim(), fraction: match[2]! };
}
