import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { fetchTurma } from "@/features/app/turmas/data";
import { fetchLessonPlan } from "@/features/app/aulas/data";
import type { LessonPlanDTO } from "@/features/app/aulas/types";
import { Wizard } from "@/features/app/provas/wizard";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fromLessonPlan?: string }>;
}

export const metadata: Metadata = {
  title: "Nova prova",
};

export default async function NovaProvaPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { fromLessonPlan } = await searchParams;

  let turma;
  try {
    turma = await fetchTurma(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  // Handoff a partir de um plano de aula: semeia o wizard com o conteúdo do
  // plano (objetivos + BNCC + conteúdo) como material e o título.
  let seed: { title?: string; pastedText?: string } | undefined;
  if (fromLessonPlan) {
    try {
      const plan = await fetchLessonPlan(fromLessonPlan);
      seed = { title: plan.identification.title, pastedText: buildSeedText(plan) };
    } catch {
      // Plano sumiu / sem acesso — segue sem seed.
    }
  }

  return (
    <Wizard
      classId={turma.id}
      turmaName={turma.name}
      seed={seed}
      fromLessonPlanId={fromLessonPlan}
    />
  );
}

// Monta o material-base pra geração da prova a partir do plano.
function buildSeedText(plan: LessonPlanDTO): string {
  const c = plan.content;
  const parts: string[] = [];
  if (c.objectives.length > 0) {
    parts.push(`### Objetivos\n${c.objectives.map((o) => `- ${o}`).join("\n")}`);
  }
  if (c.bnccSkills.length > 0) {
    parts.push(
      `### Habilidades BNCC\n${c.bnccSkills
        .map((s) => `- ${s.code}: ${s.description}`)
        .join("\n")}`,
    );
  }
  if (c.content.trim()) parts.push(`### Conteúdo\n${c.content}`);
  if (c.development.trim()) parts.push(`### Desenvolvimento\n${c.development}`);
  return parts.join("\n\n");
}
