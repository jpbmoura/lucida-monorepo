"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  monthShort,
  periodToSearchParams,
  previousPeriod,
} from "../period";
import type { FinancePeriod, FinancePeriodKind } from "../types";

interface PeriodFilterProps {
  active: FinancePeriod;
  baseHref?: string;
}

const KIND_LABELS: Record<FinancePeriodKind, string> = {
  month: "Mês",
  quarter: "Trimestre",
  year: "Ano",
};

const KIND_ORDER: FinancePeriodKind[] = ["month", "quarter", "year"];

// Filtro do dashboard financeiro. Tem 3 partes:
// 1) tabs do tipo de período (mês/trimestre/ano);
// 2) setas de navegação prev/next;
// 3) seletores específicos (mês, trimestre ou ano) — só mês e quarter têm
//    dropdown porque ano fica óbvio na seta.
export function PeriodFilter({
  active,
  baseHref = "/kintal/financeiro",
}: PeriodFilterProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const navigate = (next: FinancePeriod) => {
    const qs = periodToSearchParams(next).toString();
    startTransition(() => router.push(`${baseHref}?${qs}`));
  };

  const setKind = (kind: FinancePeriodKind) => {
    // Trocar "tipo" mantém o ano e tenta preservar o sub-período mais
    // próximo. Sem isso, voltar pra "ano" perderia a referência.
    if (kind === active.kind) return;
    if (kind === "month") {
      const month =
        active.kind === "quarter"
          ? (active.quarter - 1) * 3 + 1
          : new Date().getUTCMonth() + 1;
      navigate({ kind: "month", year: active.year, month });
      return;
    }
    if (kind === "quarter") {
      const quarter =
        active.kind === "month"
          ? Math.ceil(active.month / 3)
          : Math.floor(new Date().getUTCMonth() / 3) + 1;
      navigate({ kind: "quarter", year: active.year, quarter });
      return;
    }
    navigate({ kind: "year", year: active.year });
  };

  const prev = previousPeriod(active);
  const prevQs = periodToSearchParams(prev).toString();

  // "Próximo" só faz sentido se o período seguinte ainda for histórico
  // (não muito futuro). Permitimos o usuário até um período além do atual.
  const next = nextPeriod(active);
  const nextQs = periodToSearchParams(next).toString();

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div role="tablist" className="inline-flex shrink-0 rounded-pill bg-gray-100 p-1">
        {KIND_ORDER.map((k) => {
          const isActive = k === active.kind;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-pill px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-white text-ink shadow-soft"
                  : "text-gray-500 hover:text-ink",
              )}
            >
              {KIND_LABELS[k]}
            </button>
          );
        })}
      </div>

      <div className="inline-flex items-center gap-1 rounded-pill border border-gray-100 bg-white p-1">
        <Link
          href={`${baseHref}?${prevQs}`}
          aria-label="Período anterior"
          className="grid size-7 place-items-center rounded-pill text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink"
        >
          <ChevronLeft className="size-3.5" />
        </Link>

        <PeriodSelector active={active} onChange={navigate} />

        <Link
          href={`${baseHref}?${nextQs}`}
          aria-label="Próximo período"
          className="grid size-7 place-items-center rounded-pill text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink"
        >
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

function PeriodSelector({
  active,
  onChange,
}: {
  active: FinancePeriod;
  onChange: (p: FinancePeriod) => void;
}) {
  const yearOptions = buildYearOptions(active.year);

  return (
    <div className="flex items-center gap-1.5 px-1.5 text-xs font-medium text-ink">
      {active.kind === "month" && (
        <select
          value={active.month}
          onChange={(e) =>
            onChange({
              kind: "month",
              year: active.year,
              month: Number(e.target.value),
            })
          }
          className="cursor-pointer rounded-md bg-transparent px-1 py-0.5 text-xs font-medium text-ink hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
          aria-label="Mês"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {monthShort(m)}
            </option>
          ))}
        </select>
      )}

      {active.kind === "quarter" && (
        <select
          value={active.quarter}
          onChange={(e) =>
            onChange({
              kind: "quarter",
              year: active.year,
              quarter: Number(e.target.value),
            })
          }
          className="cursor-pointer rounded-md bg-transparent px-1 py-0.5 text-xs font-medium text-ink hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
          aria-label="Trimestre"
        >
          {[1, 2, 3, 4].map((q) => (
            <option key={q} value={q}>
              T{q}
            </option>
          ))}
        </select>
      )}

      <select
        value={active.year}
        onChange={(e) => {
          const y = Number(e.target.value);
          if (active.kind === "month") onChange({ kind: "month", year: y, month: active.month });
          else if (active.kind === "quarter") onChange({ kind: "quarter", year: y, quarter: active.quarter });
          else onChange({ kind: "year", year: y });
        }}
        className="cursor-pointer rounded-md bg-transparent px-1 py-0.5 text-xs font-medium text-ink hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
        aria-label="Ano"
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

function nextPeriod(period: FinancePeriod): FinancePeriod {
  switch (period.kind) {
    case "month":
      if (period.month === 12) return { kind: "month", year: period.year + 1, month: 1 };
      return { kind: "month", year: period.year, month: period.month + 1 };
    case "quarter":
      if (period.quarter === 4) return { kind: "quarter", year: period.year + 1, quarter: 1 };
      return { kind: "quarter", year: period.year, quarter: period.quarter + 1 };
    case "year":
      return { kind: "year", year: period.year + 1 };
  }
}

// Janela de anos pra dropdown: 5 atrás até o atual + 1.
function buildYearOptions(centeredOn: number): number[] {
  const currentYear = new Date().getUTCFullYear();
  const start = Math.min(currentYear - 5, centeredOn - 1);
  const end = Math.max(currentYear + 1, centeredOn + 1);
  const out: number[] = [];
  for (let y = end; y >= start; y--) out.push(y);
  return out;
}
