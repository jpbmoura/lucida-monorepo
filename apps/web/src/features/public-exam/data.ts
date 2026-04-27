import "server-only";
import type { PublicExamDTO } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export async function fetchPublicExam(shareId: string): Promise<PublicExamDTO | null> {
  const res = await fetch(
    `${API_URL}/v1/public/exams/${encodeURIComponent(shareId)}`,
    { cache: "no-store" },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Falha ao buscar prova pública (${res.status})`);
  const json = (await res.json()) as { data: PublicExamDTO };
  return json.data;
}

export interface ResolveTokenDTO {
  exam: { id: string; title: string };
  student: { id: string; name: string };
  submission:
    | { status: "not_started" }
    | { status: "in_progress"; submissionId: string }
    | {
        status: "submitted";
        submissionId: string;
        score: number;
        questionCount: number;
        submittedAt: string;
      };
}

export type ResolveTokenResult =
  | { ok: true; data: ResolveTokenDTO }
  | { ok: false; code: string; message: string };

/**
 * Server-side: valida o token de link de prova e retorna metadata pra
 * UI mostrar nome do aluno + estado da submissão. NÃO cria submissão —
 * isso é feito quando o aluno clica "Começar prova".
 */
export async function resolveExamLinkToken(
  shareId: string,
  token: string,
): Promise<ResolveTokenResult> {
  const res = await fetch(
    `${API_URL}/v1/public/exams/${encodeURIComponent(shareId)}/resolve-token?token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (res.ok) {
    const json = (await res.json()) as { data: ResolveTokenDTO };
    return { ok: true, data: json.data };
  }
  const errBody = (await res.json().catch(() => null)) as
    | { code?: string; message?: string }
    | null;
  return {
    ok: false,
    code: errBody?.code ?? "UNKNOWN",
    message: errBody?.message ?? "Não foi possível validar o link.",
  };
}
