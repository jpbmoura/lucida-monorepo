import type { Submission } from "./submission.js";
import type { SubmissionId } from "./submission-id.js";

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
