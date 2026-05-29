"use client";

import { ShieldQuestion } from "lucide-react";
import {
  BLOCK_META,
  SEGMENT_META,
  type LessonPlanBlockKey,
  type LessonPlanContent,
  type LessonPlanSegment,
} from "../types";

interface PlanViewProps {
  segment: LessonPlanSegment;
  content: LessonPlanContent;
}

const ORDER: LessonPlanBlockKey[] = [
  "objectives",
  "content",
  "methodology",
  "resources",
  "introduction",
  "development",
  "conclusion",
  "assessment",
  "bibliography",
];

// Renderização read-only do plano (modo visualização). Espelha a ordem e os
// rótulos do PlanBlocks, mas sem edição.
export function PlanView({ segment, content }: PlanViewProps) {
  const showBibliography = segment === "FACULDADE" || segment === "MEDIO";

  return (
    <div className="flex flex-col gap-4">
      {ORDER.map((key) => {
        if (key === "bibliography" && !showBibliography) return null;
        const meta = BLOCK_META[key];
        const value = content[key];

        const isEmpty =
          meta.kind === "list"
            ? (value as string[]).length === 0
            : !(value as string).trim();
        if (isEmpty) return null;

        return (
          <section key={key} className="rounded-2xl border border-gray-100 bg-white p-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">{meta.label}</h3>
            {meta.kind === "list" ? (
              <ul className="ml-5 list-disc text-sm leading-relaxed text-gray-700">
                {(value as string[]).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {value as string}
              </p>
            )}
            {key === "objectives" &&
              SEGMENT_META[segment].hasBncc &&
              content.bnccSkills.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-ink">
                      Habilidades BNCC
                    </h4>
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                      <ShieldQuestion className="size-3" />
                      Sugerido pela IA — confira
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1">
                    {content.bnccSkills.map((s, i) => (
                      <li key={i} className="text-sm text-ink">
                        <span className="font-semibold">{s.code}</span>{" "}
                        <span className="text-gray-600">{s.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </section>
        );
      })}
    </div>
  );
}
