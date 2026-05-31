"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  Slide,
  SlideDeckSource,
  SlideTheme,
  SlideTone,
  GenerationUsage,
} from "./types";

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function toError(err: unknown): ActionResult["error"] {
  if (err instanceof ApiError) return { code: err.code, message: err.message };
  if (err instanceof z.ZodError) {
    return {
      code: "VALIDATION_ERROR",
      message: err.issues[0]?.message ?? "Entrada inválida",
    };
  }
  return { code: "UNKNOWN", message: "Erro inesperado." };
}

export interface CreateDeckInput {
  courseId?: string | null;
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
  theme: SlideTheme;
  source: SlideDeckSource;
  slides: Slide[];
  usage?: GenerationUsage | null;
}

// A validação estrita (forma dos slides) é feita pelo Zod do backend. Aqui só
// checamos o essencial e encaminhamos — espelha createLessonPlanAction.
export async function createSlideDeckAction(
  input: CreateDeckInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!input.title || input.title.trim().length < 2) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["title"],
          message: "Título precisa ter ao menos 2 caracteres.",
        },
      ]);
    }
    if (!input.slides.length) {
      throw new z.ZodError([
        { code: "custom", path: ["slides"], message: "Apresentação sem slides." },
      ]);
    }
    const response = await apiFetch<{ data: { id: string } }>("/v1/slide-decks", {
      method: "POST",
      body: input,
    });
    revalidatePath("/app/apresentacoes");
    return { ok: true, data: response.data };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

export interface UpdateDeckInput {
  title?: string;
  subject?: string;
  gradeLevel?: string;
  tone?: SlideTone;
  theme?: SlideTheme;
  courseId?: string | null;
  slides?: Slide[];
}

export async function updateSlideDeckAction(
  id: string,
  input: UpdateDeckInput,
): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/slide-decks/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: input,
    });
    revalidatePath(`/app/apresentacoes/${id}`);
    revalidatePath("/app/apresentacoes");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

export async function reorderSlidesAction(
  id: string,
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/slide-decks/${encodeURIComponent(id)}/reorder`, {
      method: "POST",
      body: { orderedIds },
    });
    revalidatePath(`/app/apresentacoes/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}

export async function deleteSlideDeckAction(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/slide-decks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    revalidatePath("/app/apresentacoes");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toError(err) };
  }
}
