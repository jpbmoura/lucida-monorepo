import { ExamId } from "@/domains/exam/domain/exam-id.js";
import { ExamNotFoundError } from "@/domains/exam/domain/exam-errors.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { SubmissionRepository } from "../domain/submission-repository.js";
import type {
  IntegrityFlags,
  SubmissionEndReason,
  SubmissionSource,
} from "../domain/submission.js";

interface Input {
  examId: string;
  ownerId: string;
}

export interface ListSubmissionsItem {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  score: number;
  correctCount: number;
  questionCount: number;
  submittedAt: Date;
  source: SubmissionSource;
  endReason: SubmissionEndReason;
  integrityFlags: IntegrityFlags;
}

export interface ListSubmissionsOutput {
  items: ListSubmissionsItem[];
  stats: {
    total: number;
    average: number; // 0..10
    highest: number | null;
    lowest: number | null;
    passRate: number | null; // % >= 6
    inProgress: number; // em curso mas ainda não enviaram
  };
}

export class ListSubmissionsByExamUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly submissions: SubmissionRepository,
  ) {}

  async execute(input: Input): Promise<ListSubmissionsOutput> {
    const exam = await this.exams.findById(ExamId.of(input.examId));
    if (!exam || !exam.isOwnedBy(input.ownerId)) throw new ExamNotFoundError();

    const all = await this.submissions.findByExamId(exam.id.toString());
    const inProgress = all.filter((s) => s.status === "in_progress").length;

    const items: ListSubmissionsItem[] = all
      .filter(
        (s): s is typeof s & { submittedAt: Date; endReason: SubmissionEndReason } =>
          s.status === "submitted" && s.submittedAt !== null && s.endReason !== null,
      )
      .map((s) => ({
        id: s.id.toString(),
        studentId: s.studentId,
        studentName: s.studentName,
        studentCode: s.studentCode,
        score: s.score,
        correctCount: s.correctCount,
        questionCount: s.questionCount,
        submittedAt: s.submittedAt,
        source: s.source,
        endReason: s.endReason,
        integrityFlags: s.integrityFlags,
      }))
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

    if (items.length === 0) {
      return {
        items,
        stats: {
          total: 0,
          average: 0,
          highest: null,
          lowest: null,
          passRate: null,
          inProgress,
        },
      };
    }

    const scores = items.map((i) => i.score);
    const average =
      Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    const passCount = scores.filter((s) => s >= 6).length;

    return {
      items,
      stats: {
        total: items.length,
        average,
        highest: Math.max(...scores),
        lowest: Math.min(...scores),
        passRate: Math.round((passCount / items.length) * 100),
        inProgress,
      },
    };
  }
}
