"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface ActivityChartProps {
  data: Array<{
    date: string;
    submissions: number;
    averageScore: number | null;
  }>;
}

export function ActivityChart({ data }: ActivityChartProps) {
  const formatted = data.map((d) => ({
    date: d.date,
    label: shortDate(d.date),
    submissions: d.submissions,
  }));

  // Se todos os valores são 0, mostra só a baseline vazia.
  const maxSubs = Math.max(0, ...formatted.map((d) => d.submissions));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formatted}
          margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="submissionsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-primary)" stopOpacity={0.28} />
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
                | { label: string; submissions: number }
                | undefined;
              if (!p) return null;
              return (
                <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-pop">
                  <div className="font-medium text-ink">{p.label}</div>
                  <div className="mt-0.5 text-gray-500 tabular-nums">
                    {p.submissions}{" "}
                    {p.submissions === 1 ? "submissão" : "submissões"}
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="submissions"
            stroke="var(--color-brand-primary)"
            strokeWidth={2}
            fill="url(#submissionsGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${d}/${m}`;
}
