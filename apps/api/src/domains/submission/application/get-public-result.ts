import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { QuestionType } from "@/domains/exam/domain/question.js";
import type { SubmissionRepository } from "../domain/submission-repository.js";
import { SubmissionId } from "../domain/submission-id.js";
import type { GradingStatus } from "../domain/submission.js";
import {
  ExamShareNotFoundError,
  SubmissionSessionNotFoundError,
} from "../domain/submission-errors.js";

interface Input {
  shareId: string;
  submissionId: string;
}

export interface PublicGradedCriterion {
  name: string;
  levelLabel: string;
  descriptor: string;
  points: number;
  maxPoints: number;
  feedback: string;
}

export interface PublicOpenGradeView {
  earned: number;
  max: number;
  fraction: number;
  criteria: PublicGradedCriterion[];
}

export interface PublicQuestionResult {
  type: QuestionType;
  correctAnswer: number;
  explanation: string;
  /** Correção da discursiva — só presente quando já aprovada (visível ao aluno). */
  grade: PublicOpenGradeView | null;
}

export interface PublicResultDTO {
  id: string;
  score: number;
  correctCount: number;
  questionCount: number;
  gradingStatus: GradingStatus;
  answers: Array<number | null>;
  textAnswers: Array<string | null>;
  questionResults: PublicQuestionResult[];
}

/**
 * Resultado da prova visível ao aluno ao revisitar o link. Mesma regra de
 * visibilidade do gabarito objetivo: a rubrica + feedback das discursivas só
 * aparecem depois que o professor corrige (grade `approved`). O `submissionId`
 * (UUID não adivinhável) atua como capacidade de acesso, igual ao `shareId`.
 */
export class GetPublicResultUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly submissions: SubmissionRepository,
  ) {}

  async execute(input: Input): Promise<PublicResultDTO> {
    const exam = await this.exams.findByShareId(input.shareId);
    if (!exam) throw new ExamShareNotFoundError();

    const submission = await this.submissions.findById(
      SubmissionId.of(input.submissionId),
    );
    if (!submission || submission.examId !== exam.id.toString()) {
      throw new SubmissionSessionNotFoundError();
    }

    const approvedByIndex = new Map(
      submission.openGrades
        .filter((g) => g.status === "approved")
        .map((g) => [g.questionIndex, g]),
    );

    const questionResults: PublicQuestionResult[] = exam.questions.map(
      (q, i) => {
        if (q.type !== "open" || !q.rubric) {
          return {
            type: q.type,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            grade: null,
          };
        }

        const grade = approvedByIndex.get(i);
        if (!grade) {
          return {
            type: q.type,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            grade: null,
          };
        }

        const rubric = q.rubric;
        const criteria: PublicGradedCriterion[] = grade.criteria.map((gc) => {
          const rc = rubric.criteria.find((c) => c.id === gc.criterionId);
          const level = rc?.levels.find((l) => l.id === gc.levelId);
          return {
            name: rc?.name ?? "",
            levelLabel: level?.label ?? "",
            descriptor: level?.descriptor ?? "",
            points: gc.points,
            maxPoints: rc ? Math.max(0, ...rc.levels.map((l) => l.points)) : 0,
            feedback: gc.feedback,
          };
        });

        return {
          type: q.type,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          grade: {
            earned: grade.earned,
            max: grade.max,
            fraction: grade.fraction(),
            criteria,
          },
        };
      },
    );

    return {
      id: submission.id.toString(),
      score: submission.score,
      correctCount: submission.correctCount,
      questionCount: submission.questionCount,
      gradingStatus: submission.gradingStatus,
      answers: submission.answers,
      textAnswers: submission.textAnswers,
      questionResults,
    };
  }
}
