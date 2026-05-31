import type { SubmissionRepository } from "../domain/submission-repository.js";
import { SubmissionId } from "../domain/submission-id.js";
import type { GradingStatus } from "../domain/submission.js";
import { SubmissionNotFoundError } from "../domain/submission-errors.js";
import type { SubmissionEventDispatcher } from "./submit-exam.js";

interface Input {
  submissionId: string;
  ownerId: string;
}

export interface ApproveOpenGradesOutput {
  submissionId: string;
  score: number;
  gradingStatus: GradingStatus;
}

/**
 * Aprovação (em lote) dos rascunhos de correção por IA de uma submissão. Promove
 * `ai_suggested → approved`, recompõe a nota e dispara o webhook quando a nota
 * fecha. O professor pode antes ajustar via correção manual (que já grava
 * `approved`); este caminho é o "aprovar como está". Só o dono da prova.
 */
export class ApproveOpenGradesUseCase {
  constructor(
    private readonly submissions: SubmissionRepository,
    private readonly dispatcher?: SubmissionEventDispatcher,
  ) {}

  async execute(input: Input): Promise<ApproveOpenGradesOutput> {
    const submission = await this.submissions.findById(
      SubmissionId.of(input.submissionId),
    );
    if (!submission || !submission.isOwnedBy(input.ownerId)) {
      throw new SubmissionNotFoundError();
    }

    submission.approveOpenGrades(input.ownerId, new Date());
    await this.submissions.save(submission);

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
