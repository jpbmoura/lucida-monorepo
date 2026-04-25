"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api-client";

const createTurmaSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(200).optional(),
});

const updateTurmaSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(200).optional(),
});

const createAlunoSchema = z.object({
  name: z.string().min(2).max(120),
  matricula: z.string().min(1).max(40),
  email: z.string().email().optional().nullable(),
});

const updateAlunoSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  matricula: z.string().min(1).max(40).optional(),
  email: z.string().email().nullable().optional(),
});

export interface ActionResult {
  ok: boolean;
  error?: { code: string; message: string };
}

function toResult(err: unknown): ActionResult {
  if (err instanceof ApiError) {
    return { ok: false, error: { code: err.code, message: err.message } };
  }
  if (err instanceof z.ZodError) {
    return {
      ok: false,
      error: { code: "VALIDATION_ERROR", message: err.issues[0]?.message ?? "Entrada inválida" },
    };
  }
  return { ok: false, error: { code: "UNKNOWN", message: "Erro inesperado." } };
}

// ---------- Turmas ----------

export async function createTurmaAction(input: unknown): Promise<ActionResult> {
  try {
    const body = createTurmaSchema.parse(input);
    await apiFetch("/v1/classes", { method: "POST", body });
    revalidatePath("/app/turmas");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function updateTurmaAction(id: string, input: unknown): Promise<ActionResult> {
  try {
    const body = updateTurmaSchema.parse(input);
    await apiFetch(`/v1/classes/${encodeURIComponent(id)}`, { method: "PUT", body });
    revalidatePath("/app/turmas");
    revalidatePath(`/app/turmas/${id}`);
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function deleteTurmaAction(id: string): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/classes/${encodeURIComponent(id)}`, { method: "DELETE" });
    revalidatePath("/app/turmas");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

// ---------- Alunos ----------

export async function createAlunoAction(
  classId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const body = createAlunoSchema.parse(input);
    await apiFetch(`/v1/classes/${encodeURIComponent(classId)}/students`, {
      method: "POST",
      body,
    });
    revalidatePath(`/app/turmas/${classId}`);
    revalidatePath("/app/turmas");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function updateAlunoAction(
  classId: string,
  studentId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const body = updateAlunoSchema.parse(input);
    await apiFetch(`/v1/students/${encodeURIComponent(studentId)}`, {
      method: "PUT",
      body,
    });
    revalidatePath(`/app/turmas/${classId}`);
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function deleteAlunoAction(
  classId: string,
  studentId: string,
): Promise<ActionResult> {
  try {
    await apiFetch(`/v1/students/${encodeURIComponent(studentId)}`, { method: "DELETE" });
    revalidatePath(`/app/turmas/${classId}`);
    revalidatePath("/app/turmas");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}
