import { ExamId } from "../domain/exam-id.js";
import { ExamNotFoundError } from "../domain/exam-errors.js";
import type { QuestionSnapshot } from "../domain/question.js";
import type { ExamRepository } from "../domain/exam-repository.js";

interface Input {
  examId: string;
  ownerId: string;
}

export interface GetExamOutput {
  id: string;
  classId: string;
  title: string;
  description: string;
  style: "simple" | "contextual" | "analytical" | "reflective";
  duration: number;
  securityLevel: "off" | "strict";
  shareId: string;
  questions: QuestionSnapshot[];
  usage: { inputTokens: number; outputTokens: number; credits: number } | null;
  createdAt: Date;
  updatedAt: Date;
}

export class GetExamUseCase {
  constructor(private readonly exams: ExamRepository) {}

  async execute(input: Input): Promise<GetExamOutput> {
    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam || !exam.isOwnedBy(input.ownerId)) throw new ExamNotFoundError();

    return {
      id: exam.id.toString(),
      classId: exam.classId,
      title: exam.title,
      description: exam.description,
      style: exam.style,
      duration: exam.duration,
      securityLevel: exam.securityLevel,
      shareId: exam.shareId,
      questions: exam.questions.map((q) => q.toJSON()),
      usage: exam.usage,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    };
  }
}
