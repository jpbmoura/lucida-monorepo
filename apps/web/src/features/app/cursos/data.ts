import "server-only";
import { apiFetch } from "@/lib/api-client";
import type { TurmaDTO } from "@/features/app/turmas/types";
import type { CursoDTO, CursoDetailDTO } from "./types";

interface RawCurso {
  id: string;
  name: string;
  description: string;
  classCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RawCursoDetail extends RawCurso {
  classes: TurmaDTO[];
}

export async function fetchCursos(): Promise<CursoDTO[]> {
  const res = await apiFetch<{ data: RawCurso[] }>("/v1/courses");
  return res.data;
}

export async function fetchCurso(id: string): Promise<CursoDetailDTO> {
  const res = await apiFetch<{ data: RawCursoDetail }>(
    `/v1/courses/${encodeURIComponent(id)}`,
  );
  return res.data;
}
