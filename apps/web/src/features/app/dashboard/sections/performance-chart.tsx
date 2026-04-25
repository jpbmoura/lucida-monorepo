"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { OverviewDTO } from "@/features/app/analises/data";

interface PerformanceChartProps {
  activity: OverviewDTO["activity"];
  hasActivity: boolean;
}

export function PerformanceChart({ activity, hasActivity }: PerformanceChartProps) {
  const totalSubs = activity.reduce((acc, d) => acc + d.submissions, 0);
  const activeDays = activity.filter((d) => d.submissions > 0).length;
  const peak = activity.reduce(
    (best, d) => (d.submissions > best.submissions ? d : best),
    { date: "", submissions: 0, averageScore: null as number | null },
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-ink">
            Atividade{" "}
            <span className="font-serif text-[1.1em] italic text-gray-500">
              no período
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Submissões recebidas por dia
          </p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary">
          <TrendingUp className="size-4" />
        </span>
      </div>

      <div className="mb-6 flex gap-8 border-b border-gray-100 pb-6">
        <Stat label="Total" value={totalSubs.toLocaleString("pt-BR")} />
        <Stat
          label="Dias com atividade"
          value={activeDays.toString()}
          suffix={`/${activity.length}`}
        />
        <Stat
          label="Pico num dia"
          value={peak.submissions.toLocaleString("pt-BR")}
        />
      </div>

      {hasActivity ? (
        <ChartArea data={activity} />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1 text-[28px] font-medium leading-none tracking-tighter text-ink tabular-nums">
        {value}
        {suffix && <span className="text-sm text-gray-400">{suffix}</span>}
      </div>
    </div>
  );
}

function ChartArea({ data }: { data: OverviewDTO["activity"] }) {
  const formatted = data.map((d) => ({
    label: shortDate(d.date),
    submissions: d.submissions,
    averageScore: d.averageScore,
  }));
  const maxSubs = Math.max(0, ...formatted.map((d) => d.submissions));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formatted}
          margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="dashboardSubsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-gray-100)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--color-gray-500)" }}
            stroke="var(--color-gray-200)"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--color-gray-500)" }}
            stroke="var(--color-gray-200)"
            tickLine={false}
            axisLine={false}
            width={32}
            domain={[0, Math.max(3, maxSubs + 1)]}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-gray-300)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as
                | { label: string; submissions: number; averageScore: number | null }
                | undefined;
              if (!p) return null;
              return (
                <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-pop">
                  <div className="font-medium text-ink">{p.label}</div>
                  <div className="mt-0.5 text-gray-500 tabular-nums">
                    {p.submissions}{" "}
                    {p.submissions === 1 ? "submissão" : "submissões"}
                  </div>
                  {p.averageScore !== null && (
                    <div className="text-gray-500 tabular-nums">
                      média{" "}
                      {p.averageScore.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="submissions"
            stroke="var(--color-brand-primary)"
            strokeWidth={2}
            fill="url(#dashboardSubsGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 text-center">
      <p className="text-sm font-medium text-ink">
        Sem submissões no período
      </p>
      <p className="max-w-xs text-[12px] text-gray-500">
        Aplique uma prova online ou digitalize folhas pelo scanner — os dados
        vão aparecer aqui.
      </p>
    </div>
  );
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${d}/${m}`;
}
