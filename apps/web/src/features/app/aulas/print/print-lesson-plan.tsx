"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEGMENT_META, type LessonPlanDTO } from "../types";

interface PrintLessonPlanProps {
  plan: LessonPlanDTO;
}

export function PrintLessonPlan({ plan }: PrintLessonPlanProps) {
  const c = plan.content;
  const id = plan.identification;
  const showBibliography =
    plan.segment === "FACULDADE" || plan.segment === "MEDIO";

  const idBits = [
    SEGMENT_META[plan.segment].label,
    id.subject,
    id.level,
    id.durationMinutes > 0 ? `${id.durationMinutes} min` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <div className="print-toolbar">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-ink">{id.title}</span>
          <span className="mx-2 text-gray-400">·</span>
          <span className="text-xs">
            Use Ctrl+P (Cmd+P) → &ldquo;Salvar como PDF&rdquo;
          </span>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          Imprimir
        </Button>
      </div>

      <article className="print-page">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {id.title}
          </h1>
          {idBits.length > 0 && (
            <p className="mt-1 text-sm italic text-gray-600">
              {idBits.join("  •  ")}
            </p>
          )}
        </header>

        <div className="flex flex-col gap-5">
          <ListBlock title="Objetivos de aprendizagem" items={c.objectives} />
          {SEGMENT_META[plan.segment].hasBncc && c.bnccSkills.length > 0 && (
            <section className="break-inside-avoid">
              <Heading>Habilidades BNCC</Heading>
              <ul className="ml-5 list-disc text-sm text-ink">
                {c.bnccSkills.map((s, i) => (
                  <li key={i}>
                    <span className="font-semibold">{s.code}</span> {s.description}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <TextBlock title="Conteúdo" value={c.content} />
          <TextBlock title="Metodologia" value={c.methodology} />
          <ListBlock title="Recursos" items={c.resources} />
          <TextBlock title="Introdução" value={c.introduction} />
          <TextBlock title="Desenvolvimento" value={c.development} />
          <TextBlock title="Conclusão" value={c.conclusion} />
          <TextBlock title="Avaliação" value={c.assessment} />
          {showBibliography && (
            <ListBlock title="Bibliografia" items={c.bibliography} />
          )}
        </div>
      </article>
    </>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-ink">
      {children}
    </h2>
  );
}

function TextBlock({ title, value }: { title: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <section className="break-inside-avoid">
      <Heading>{title}</Heading>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
        {value}
      </p>
    </section>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="break-inside-avoid">
      <Heading>{title}</Heading>
      <ul className="ml-5 list-disc text-sm leading-relaxed text-ink">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
