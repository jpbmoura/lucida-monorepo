// DTOs que a API devolve. Compartilhados entre server (data.ts) e client (componentes).

export interface TurmaDTO {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string | null;
  studentsCount: number;
  examsCount: number;
  activeExamsCount: number;
}

export interface AlunoDTO {
  id: string;
  code: string;
  name: string;
  matricula: string;
  email: string | null;
  createdAt: string;
}

export interface TurmaExamDTO {
  id: string;
  title: string;
  questionCount: number;
  duration: number;
  securityLevel: "off" | "strict";
  shareId: string;
  submissionsCount: number;
  /** 0..10 — null quando ainda não há submissões finalizadas. */
  averageScore: number | null;
  createdAt: string;
}
