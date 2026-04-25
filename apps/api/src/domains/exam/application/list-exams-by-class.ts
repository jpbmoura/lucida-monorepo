import type { ExamRepository } from "../domain/exam-repository.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ClassNotFoundError } from "@/domains/class/domain/class-errors.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";
import type { SubmissionRepository } from "@/domains/submission/domain/submission-repository.js";

interface Input {
  classId: string;
  ownerId: string;
}

export interface ListExamsItem {
  id: string;
  title: string;
  style: "simple" | "contextual" | "analytical" | "reflective";
  questionCount: number;
  duration: number;
  securityLevel: "off" | "strict";
  shareId: string;
  submissionsCount: number;
  averageScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ListExamsByClassUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly classes: ClassRepository,
    private readonly submissions: SubmissionRepository,
  ) {}

  async execute(input: Input): Promise<ListExamsItem[]> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }
    const exams = await this.exams.findByClassId(cls.id.toString());
    const stats = await this.submissions.statsByExamIds(
      exams.map((e) => e.id.toString()),
    );
    return exams.map((e) => {
      const s = stats.get(e.id.toString());
      return {
        id: e.id.toString(),
        title: e.title,
        style: e.style,
        questionCount: e.questions.length,
        duration: e.duration,
        securityLevel: e.securityLevel,
        shareId: e.shareId,
        submissionsCount: s?.submissionsCount ?? 0,
        averageScore: s?.averageScore ?? null,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      };
    });
  }
}
