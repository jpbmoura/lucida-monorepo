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
import type { DifficultyKey } from "../data";

interface PerQuestionChartProps {
  data: Array<{
    questionNumber: number;
    difficulty: DifficultyKey;
    statement: string;
    accuracy: number;
    totalAnswered: number;
    correctCount: number;
  }>;
}

export function PerQuestionChart({ data }: PerQuestionChartProps) {
  return (
    <div className="h-[280px] w-full">
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
            dataKey="questionNumber"
            tick={{ fontSize: 10, fill: "var(--color-gray-500)" }}
            stroke="var(--color-gray-200)"
            tickLine={false}
            axisLine={false}
            interval={data.length > 30 ? 4 : data.length > 15 ? 1 : 0}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: "var(--color-gray-500)" }}
            stroke="var(--color-gray-200)"
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: "var(--color-gray-50)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload as
                | PerQuestionChartProps["data"][number]
                | undefined;
              if (!p) return null;
              return (
                <div className="max-w-xs rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs shadow-pop">
                  <div className="mb-1 font-medium text-ink">
                    Questão {p.questionNumber}
                    <span className="ml-2 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal capitalize text-gray-600">
                      {p.difficulty}
                    </span>
                  </div>
                  <p className="mb-1 line-clamp-3 text-[11px] text-gray-600">
                    {p.statement}
                  </p>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                    <span className="tabular-nums">
                      {p.correctCount}/{p.totalAnswered} acertos
                    </span>
                    <span className={`font-semibold ${tone(p.accuracy)}`}>
                      {p.accuracy}%
                    </span>
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.questionNumber} fill={colorFor(d.accuracy)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function colorFor(accuracy: number): string {
  if (accuracy >= 80) return "var(--color-emerald-500, #10b981)";
  if (accuracy >= 60) return "var(--color-amber-400, #fbbf24)";
  if (accuracy >= 40) return "var(--color-orange-400, #fb923c)";
  return "var(--color-red-400, #f87171)";
}

function tone(accuracy: number): string {
  if (accuracy >= 80) return "text-emerald-700";
  if (accuracy >= 60) return "text-amber-700";
  return "text-red-700";
}
