"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface DistributionChartProps {
  data: Array<{ range: string; count: number }>;
}

export function DistributionChart({ data }: DistributionChartProps) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-gray-100)"
            vertical={false}
          />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 10, fill: "var(--color-gray-500)" }}
            stroke="var(--color-gray-200)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--color-gray-500)" }}
            stroke="var(--color-gray-200)"
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "var(--color-gray-50)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as
                | { range: string; count: number }
                | undefined;
              if (!p) return null;
              return (
                <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-pop">
                  <div className="font-medium text-ink">Faixa {p.range}</div>
                  <div className="mt-0.5 text-gray-500 tabular-nums">
                    {p.count} {p.count === 1 ? "aluno" : "alunos"}
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => {
              const lower = Number(d.range.split("-")[0]);
              return (
                <Cell key={i} fill={colorFor(lower)} opacity={d.count === 0 ? 0.3 : 1} />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function colorFor(lowerBound: number): string {
  if (lowerBound < 4) return "var(--color-red-400, #f87171)";
  if (lowerBound < 6) return "var(--color-amber-400, #fbbf24)";
  if (lowerBound < 8) return "var(--color-sky-400, #38bdf8)";
  return "var(--color-emerald-500, #10b981)";
}
