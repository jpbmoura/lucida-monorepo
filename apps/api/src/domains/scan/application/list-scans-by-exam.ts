import { ExamId } from "@/domains/exam/domain/exam-id.js";
import { ExamNotFoundError } from "@/domains/exam/domain/exam-errors.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { ScanRepository } from "../domain/scan-repository.js";
import type { ScanReviewStatus } from "../domain/scan-result.js";

interface Input {
  examId: string;
  ownerId: string;
}

export interface ListScansItem {
  id: string;
  studentCode: string;
  studentName: string | null;
  studentCodeValid: boolean;
  score: number;
  correctCount: number;
  questionCount: number;
  requiresReview: boolean;
  reviewReasons: string[];
  reviewStatus: ScanReviewStatus;
  multiMarkedQuestions: number[];
  unmarkedQuestions: number[];
  scannedAt: Date;
}

export class ListScansByExamUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly scans: ScanRepository,
  ) {}

  async execute(input: Input): Promise<ListScansItem[]> {
    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam || !exam.isOwnedBy(input.ownerId)) {
      throw new ExamNotFoundError();
    }
    const all = await this.scans.findByExamId(exam.id.toString());
    return all.map((s) => ({
      id: s.id.toString(),
      studentCode: s.studentCode,
      studentName: s.studentName,
      studentCodeValid: s.studentCodeValid,
      score: s.score,
      correctCount: s.correctCount,
      questionCount: s.questionCount,
      requiresReview: s.requiresReview,
      reviewReasons: s.reviewReasons,
      reviewStatus: s.reviewStatus,
      multiMarkedQuestions: s.multiMarkedQuestions,
      unmarkedQuestions: s.unmarkedQuestions,
      scannedAt: s.scannedAt,
    }));
  }
}
