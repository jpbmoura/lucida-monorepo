import { ExamId } from "@/domains/exam/domain/exam-id.js";
import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { SubmissionRepository } from "../domain/submission-repository.js";
import { SubmissionId } from "../domain/submission-id.js";
import type { GradingStatus } from "../domain/submission.js";
import {
  OpenGrade,
  type OpenGradeCriterionResult,
} from "../domain/open-grade.js";
import {
  NotAnOpenQuestionError,
  OpenGradeInvalidError,
  SubmissionNotFoundError,
} from "../domain/submission-errors.js";
import type { SubmissionEventDispatcher } from "./submit-exam.js";

export interface ManualGradeInput {
  questionIndex: number;
  criteria: Array<{
    criterionId: string;
    levelId: string;
    justification?: string;
    feedback?: string;
  }>;
  /** Sobreposição da fração final (0..1) pelo professor; null/ausente = usar a rubrica. */
  overrideFraction?: number | null;
}

interface Input {
  submissionId: string;
  ownerId: string;
  grades: ManualGradeInput[];
}

export interface GradeOpenAnswersOutput {
  submissionId: string;
  score: number;
  gradingStatus: GradingStatus;
}

/**
 * Correção MANUAL das discursivas: o professor escolhe o nível por critério
 * (+ feedback) e, opcionalmente, sobrepõe a fração final. A nota é somada da
 * rubrica (auditável) e recomposta na submissão. Correção manual já entra como
 * `approved` (não passa por aprovação em lote). Só o dono da prova.
 */
export class GradeOpenAnswersManuallyUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly submissions: SubmissionRepository,
    private readonly dispatcher?: SubmissionEventDispatcher,
  ) {}

  async execute(input: Input): Promise<GradeOpenAnswersOutput> {
    const submission = await this.submissions.findById(
      SubmissionId.of(input.submissionId),
    );
    if (!submission || !submission.isOwnedBy(input.ownerId)) {
      throw new SubmissionNotFoundError();
    }

    const exam = await this.exams.findById(ExamId.of(submission.examId));
    if (!exam) throw new SubmissionNotFoundError();

    const now = new Date();
    const grades = input.grades.map((g) => {
      const question = exam.questions[g.questionIndex];
      if (!question || question.type !== "open" || !question.rubric) {
        throw new NotAnOpenQuestionError();
      }
      const rubric = question.rubric;
      const provided = new Map(g.criteria.map((c) => [c.criterionId, c]));

      // Constrói um resultado por critério da rubrica (fonte da verdade dos
      // pontos). Critério sem seleção conta 0 — permite crédito parcial.
      const criteria: OpenGradeCriterionResult[] = rubric.criteria.map((rc) => {
        const sel = provided.get(rc.id);
        if (!sel) {
          return {
            criterionId: rc.id,
            levelId: "",
            points: 0,
            justification: "",
            feedback: "",
          };
        }
        const level = rc.levels.find((l) => l.id === sel.levelId);
        if (!level) {
          throw new OpenGradeInvalidError(
            `Nível "${sel.levelId}" não existe no critério "${rc.name}".`,
          );
        }
        return {
          criterionId: rc.id,
          levelId: level.id,
          points: level.points,
          justification: sel.justification?.trim() ?? "",
          feedback: sel.feedback?.trim() ?? "",
        };
      });

      const earned = criteria.reduce((sum, c) => sum + c.points, 0);

      return OpenGrade.create({
        questionIndex: g.questionIndex,
        criteria,
        earned,
        max: rubric.maxPoints(),
        overriddenFraction: g.overrideFraction ?? null,
        source: "manual",
        status: "approved",
        gradedByUserId: input.ownerId,
        aiModel: null,
        gradedAt: now,
      });
    });

    submission.applyOpenGrades(grades, now);
    await this.submissions.save(submission);

    // Webhook só quando a nota fecha (todas as discursivas aprovadas).
    if (this.dispatcher && submission.gradingStatus === "graded") {
      this.dispatcher.dispatch(submission).catch(() => undefined);
    }

    return {
      submissionId: submission.id.toString(),
      score: submission.score,
      gradingStatus: submission.gradingStatus,
    };
  }
}
