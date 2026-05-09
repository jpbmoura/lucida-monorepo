import type { Exam } from "./exam.js";
import type { ExamId } from "./exam-id.js";

export interface ExamRepository {
  nextId(): ExamId;
  nextShareId(): string;
  save(exam: Exam): Promise<void>;
  findById(id: ExamId): Promise<Exam | null>;
  findByShareId(shareId: string): Promise<Exam | null>;
  findByClassId(classId: string): Promise<Exam[]>;
  findByOwnerId(ownerId: string): Promise<Exam[]>;
  countByClassId(classId: string): Promise<number>;
  countActiveByClassId(classId: string): Promise<number>;
  /** Conta provas do curso (via snapshot `exam.courseId`). */
  countByCourseId(courseId: string): Promise<number>;
  /** Lista provas do curso. Ordem: createdAt desc. */
  findByCourseId(courseId: string): Promise<Exam[]>;
  delete(id: ExamId): Promise<void>;
  deleteByClassId(classId: string): Promise<void>;
  /**
   * Atualiza o snapshot `courseId` em todas as provas de uma turma.
   * Usado pelo UpdateClassUseCase em Fase 4 quando a turma muda de curso.
   */
  updateCourseForClass(classId: string, newCourseId: string | null): Promise<void>;
}
