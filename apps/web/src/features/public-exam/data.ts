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
