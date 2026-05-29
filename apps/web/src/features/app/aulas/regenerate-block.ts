"use client";

import type {
  AulaConfig,
  LessonPlanBlockKey,
  LessonPlanContent,
  RegenerateBlockResult,
} from "./types";

// Chama o backend pra regerar UM bloco do plano, mandando o plano inteiro como
// contexto. Compartilhado pelo canvas do wizard e pela tela de detalhe.
export async function regenerateBlock(input: {
  config: AulaConfig;
  currentPlan: LessonPlanContent;
  blockKey: LessonPlanBlockKey;
  pastedText?: string;
  youtubeUrls?: string[];
}): Promise<RegenerateBlockResult> {
  const formData = new FormData();
  formData.append(
    "config",
    JSON.stringify({
      segment: input.config.segment,
      title: input.config.title,
      subject: input.config.subject,
      level: input.config.level,
      durationMinutes: input.config.durationMinutes,
      language: input.config.language,
      currentPlan: input.currentPlan,
      blockKey: input.blockKey,
      pastedText: input.pastedText ?? "",
      youtubeUrls: input.youtubeUrls ?? [],
    }),
  );

  const response = await fetch("/v1/ai/regenerate-lesson-block", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as
      | { code?: string; message?: string }
      | null;
    if (response.status === 402) {
      throw new Error(
        err?.message ?? "Sem créditos pra regerar. Compre mais pra continuar.",
      );
    }
    throw new Error(err?.message ?? "Falha ao regerar o bloco.");
  }

  const { data } = (await response.json()) as { data: RegenerateBlockResult };
  return data;
}
