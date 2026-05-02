import { Sparkles } from "lucide-react";
import { formatBrl } from "@/features/kintal/dashboard/format";
import type { FinancialSummary } from "../types";
import { periodLabel } from "../period";

interface ProjectionCardProps {
  summary: FinancialSummary;
}

// Card de projeção. Aparece quando o período está em curso e há fração
// suficiente decorrida pra extrapolar (>1%, gerenciado pelo backend). Pra
// período fechado/futuro mostra estado vazio explicando o porquê.
export function ProjectionCard({ summary }: ProjectionCardProps) {
  const { projection, current } = summary;
  const periodName = periodLabel(summary.period);

  if (!projection.isOpen) {
    return (
      <Wrapper periodName={periodName}>
        <p className="text-[13px] text-gray-500">
          Período fechado — sem projeção. Os totais acima já refletem o que
          aconteceu.
        </p>
      </Wrapper>
    );
  }

  if (
    projection.projectedGrossRevenueCents === null ||
    projection.fractionElapsed < 0.01
  ) {
    return (
      <Wrapper periodName={periodName}>
        <p className="text-[13px] text-gray-500">
          Período recém-iniciado — vamos esperar mais alguns dias pra projetar
          com confiança.
        </p>
      </Wrapper>
    );
  }

  const pctElapsed = Math.round(projection.fractionElapsed * 100);

  return (
    <Wrapper periodName={periodName}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <ProjLine
          label="Bruto projetado"
          actualCents={current.grossRevenueCents}
          projectedCents={projection.projectedGrossRevenueCents!}
          tone="primary"
        />
        <ProjLine
          label="Líquido projetado"
          actualCents={current.netRevenueCents}
          projectedCents={projection.projectedNetRevenueCents!}
          tone="default"
        />
        <ProjLine
          label="Gastos projetados"
          actualCents={current.expensesCents}
          projectedCents={projection.projectedExpensesCents!}
          tone="default"
        />
      </div>
      <p className="mt-5 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
        Extrapolação linear · {pctElapsed}% do período decorrido. Não considera
        sazonalidade, churn esperado ou top-ups planejados.
      </p>
    </Wrapper>
  );
}

function Wrapper({
  periodName,
  children,
}: {
  periodName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-medium tracking-tight text-ink">
            <Sparkles className="size-4 text-gray-400" />
            Projeção pra{" "}
            <span className="font-serif text-[1.05em] italic font-normal text-gray-500">
              {periodName}
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Estimativa pro fim do período se o ritmo atual continuar.
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ProjLine({
  label,
  actualCents,
  projectedCents,
  tone,
}: {
  label: string;
  actualCents: number;
  projectedCents: number;
  tone: "primary" | "default";
}) {
  const valueColor = tone === "primary" ? "text-ink" : "text-gray-700";
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-gray-500">
        {label}
      </span>
      <span className={`text-[1.85rem] font-medium leading-none tracking-tighter tabular-nums ${valueColor}`}>
        {formatBrl(projectedCents)}
      </span>
      <span className="text-[11px] text-gray-400">
        atual: {formatBrl(actualCents)}
      </span>
    </div>
  );
}
