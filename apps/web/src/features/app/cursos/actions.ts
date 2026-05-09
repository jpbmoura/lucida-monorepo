"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api-client";

const createCursoSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(200).optional(),
});

const updateCursoSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(200).optional(),
});

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function toResult<T = undefined>(err: unknown): ActionResult<T> {
  if (err instanceof ApiError) {
    return { ok: false, error: { code: err.code, message: err.message } };
  }
  if (err instanceof z.ZodError) {
    return {
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues[0]?.message ?? "Entrada inválida",
      },
    };
  }
  return { ok: false, error: { code: "UNKNOWN", message: "Erro inesperado." } };
}

interface CreatedCurso {
  id: string;
  name: string;
}

export async function createCursoAction(
  input: unknown,
): Promise<ActionResult<CreatedCurso>> {
  try {
    const body = createCursoSchema.parse(input);
    const res = await apiFetch<{ data: CreatedCurso }>("/v1/courses", {
      method: "POST",
      body,
    });
    revalidatePath("/app/cursos");
    return { ok: true, data: res.data };
  } catch (err) {
    return toResult<CreatedCurso>(err);
  }
}

export async function updateCursoAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const body = updateCursoSchema.parse(input);
    await apiFetch(`/v1/courses/${encodeURIComponent(id)}`, {
      method: "PUT",
      body,
    });
    revalidatePath("/app/cursos");
    revalidatePath(`/app/cursos/${id}`);
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function deleteCursoAction(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/courses/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    revalidatePath("/app/cursos");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}
