// DTOs do domínio Curso. Compartilhados entre server (data.ts) e client.

import type { TurmaDTO } from "@/features/app/turmas/types";

export interface CursoDTO {
  id: string;
  name: string;
  description: string;
  classCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Detalhe completo de um curso. As turmas vêm enriquecidas (mesmo formato
 * que `TurmaDTO`) — a UI dentro do detalhe reusa os mesmos cards/filtros
 * que a listagem global usava.
 */
export interface CursoDetailDTO {
  id: string;
  name: string;
  description: string;
  classCount: number;
  classes: TurmaDTO[];
  createdAt: string;
  updatedAt: string;
}
