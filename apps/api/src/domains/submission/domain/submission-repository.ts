import type { GradingStatus } from "./submission.js";
import type { Submission } from "./submission.js";
import type { SubmissionId } from "./submission-id.js";

/**
 * Linha enxuta de uma submissão que ainda precisa de correção manual de
 * discursivas. Projeção usada pela fila de correção (tela "Corrigir Provas") —
 * traz só o que a listagem agrupada precisa, sem carregar a submissão inteira.
 */
export interface PendingGradingRow {
  submissionId: string;
  examId: string;
  classId: string;
  courseId: string;
  studentName: string;
  studentCode: string;
  score: number;
  submittedAt: Date;
  gradingStatus: GradingStatus;
  /** Tem rascunho(s) de correção por IA aguardando revisão/aprovação. */
  hasAiDraft: boolean;
}

export interface SubmissionRepository {
  nextId(): SubmissionId;
  save(submission: Submission): Promise<void>;
  findById(id: SubmissionId): Promise<Submission | null>;
  findByExamAndStudent(
    examId: string,
    studentId: string,
  ): Promise<Submission | null>;
  findByExamId(examId: string): Promise<Submission[]>;
  countByExamId(examId: string): Promise<number>;
  /**
   * Conta submissões do professor (owner) com discursivas aguardando correção
   * (gradingStatus pending ou partially_graded). Usado no resumo do dashboard.
   */
  countPendingGradingByOwner(ownerId: string): Promise<number>;
  /**
   * Lista as submissões do professor (owner) com discursivas aguardando
   * correção (gradingStatus pending ou partially_graded), em projeção enxuta.
   * Ordem: submittedAt desc. Alimenta a fila da tela "Corrigir Provas".
   */
  findPendingGradingByOwner(ownerId: string): Promise<PendingGradingRow[]>;
  /**
   * Agrega submissões FINALIZADAS por examId. Útil pra listagens onde
   * o caller precisa de estatísticas básicas sem carregar cada submissão.
   * Retorna Map examId → stats; exams sem submissões finalizadas não aparecem.
   */
  statsByExamIds(
    examIds: string[],
  ): Promise<Map<string, { submissionsCount: number; averageScore: number }>>;
  /**
   * Atualiza o snapshot `courseId` em todas as submissões de uma turma.
   * Usado pelo UpdateClassUseCase em Fase 4 quando a turma muda de curso.
   */
  updateCourseForClass(classId: string, newCourseId: string | null): Promise<void>;
}
