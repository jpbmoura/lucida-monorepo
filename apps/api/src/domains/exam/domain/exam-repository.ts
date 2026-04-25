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
  delete(id: ExamId): Promise<void>;
  deleteByClassId(classId: string): Promise<void>;
}
