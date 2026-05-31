import { ExamId } from "@/domains/exam/domain/exam-id.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { RubricData } from "@/domains/exam/domain/rubric.js";
import type { SubmissionRepository } from "../domain/submission-repository.js";
import { SubmissionId } from "../domain/submission-id.js";
import type { GradingStatus } from "../domain/submission.js";
import type { OpenGradeCriterionResult } from "../domain/open-grade.js";
import { SubmissionNotFoundError } from "../domain/submission-errors.js";

interface Input {
  submissionId: string;
  ownerId: string;
}

export interface OpenGradeView {
  criteria: OpenGradeCriterionResult[];
  earned: number;
  max: number;
  overriddenFraction: number | null;
  fraction: number;
  source: "manual" | "ai";
  status: "ai_suggested" | "approved";
}

export interface OpenQuestionForGrading {
  questionIndex: number;
  statement: string;
  context: string | null;
  referenceAnswer: string | null;
  rubric: RubricData;
  studentAnswer: string | null;
  /** Correção já existente (rascunho IA ou aprovada); null se ainda não corrigida. */
  grade: OpenGradeView | null;
}

export interface SubmissionForGrading {
  submissionId: string;
  examId: string;
  studentName: string;
  studentCode: string;
  score: number;
  correctCount: number;
  questionCount: number;
  gradingStatus: GradingStatus;
  openQuestions: OpenQuestionForGrading[];
}

/**
 * Carrega uma submissão + as rubricas da prova + as respostas digitadas, no
 * formato que o professor usa pra corrigir as discursivas. Só o dono da prova.
 */
export class GetSubmissionForGradingUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly submissions: SubmissionRepository,
  ) {}

  async execute(input: Input): Promise<SubmissionForGrading> {
    const submission = await this.submissions.findById(
      SubmissionId.of(input.submissionId),
    );
    if (!submission || !submission.isOwnedBy(input.ownerId)) {
      throw new SubmissionNotFoundError();
    }

    const exam = await this.exams.findById(ExamId.of(submission.examId));
    if (!exam) throw new SubmissionNotFoundError();

    const questions = exam.questions;
    const textAnswers = submission.textAnswers;
    const gradeByIndex = new Map(
      submission.openGrades.map((g) => [g.questionIndex, g]),
    );

    const openQuestions: OpenQuestionForGrading[] = submission.openQuestionIndices
      .map((i) => {
        const q = questions[i];
        if (!q || q.type !== "open" || !q.rubric) return null;
        const grade = gradeByIndex.get(i);
        return {
          questionIndex: i,
          statement: q.statement,
          context: q.context,
          referenceAnswer: q.referenceAnswer,
          rubric: q.rubric.toJSON(),
          studentAnswer: textAnswers[i] ?? null,
          grade: grade
            ? {
                criteria: grade.criteria,
                earned: grade.earned,
                max: grade.max,
                overriddenFraction: grade.overriddenFraction,
                fraction: grade.fraction(),
                source: grade.source,
                status: grade.status,
              }
            : null,
        };
      })
      .filter((q): q is OpenQuestionForGrading => q !== null);

    return {
      submissionId: submission.id.toString(),
      examId: submission.examId,
      studentName: submission.studentName,
      studentCode: submission.studentCode,
      score: submission.score,
      correctCount: submission.correctCount,
      questionCount: submission.questionCount,
      gradingStatus: submission.gradingStatus,
      openQuestions,
    };
  }
}
