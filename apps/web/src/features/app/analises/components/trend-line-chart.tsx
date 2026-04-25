"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export interface TrendPoint {
  label: string;
  primary: number;
  /** Segunda série opcional (ex.: média da turma comparada ao aluno). */
  secondary?: number;
}

interface TrendLineChartProps {
  data: TrendPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  /** Domínio Y — default 0..10 (nota). */
  yDomain?: [number, number];
}

export function TrendLineChart({
  data,
  primaryLabel,
  secondaryLabel,
  yDomain = [0, 10],
}: TrendLineChartProps) {
  const hasSecondary = secondaryLabel !== undefined;

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
        >
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
            domain={yDomain}
            tick={{ fontSize: 11, fill: "var(--color-gray-500)" }}
            stroke="var(--color-gray-200)"
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-gray-300)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as TrendPoint | undefined;
              if (!point) return null;
              return (
                <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-pop">
                  <div className="mb-1 font-medium text-ink">{point.label}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                    <span className="size-2 rounded-full bg-brand-primary" />
                    <span>{primaryLabel}</span>
                    <span className="ml-auto font-semibold tabular-nums text-ink">
                      {point.primary.toLocaleString("pt-BR", {
                        minimumFractionDigits: 1,
                      })}
                    </span>
                  </div>
                  {hasSecondary && point.secondary !== undefined && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-600">
                      <span className="size-2 rounded-full bg-gray-400" />
                      <span>{secondaryLabel}</span>
                      <span className="ml-auto font-semibold tabular-nums text-ink">
                        {point.secondary.toLocaleString("pt-BR", {
                          minimumFractionDigits: 1,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              );
            }}
          />
          {hasSecondary && (
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="primary"
            name={primaryLabel}
            stroke="var(--color-brand-primary)"
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 0, fill: "var(--color-brand-primary)" }}
            activeDot={{ r: 5 }}
          />
          {hasSecondary && (
            <Line
              type="monotone"
              dataKey="secondary"
              name={secondaryLabel}
              stroke="var(--color-gray-400)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, strokeWidth: 0, fill: "var(--color-gray-400)" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
