import type { ExamRepository } from "@/domains/exam/domain/exam-repository.js";
import type { QuestionType } from "@/domains/exam/domain/question.js";
import type { SubmissionRepository } from "../domain/submission-repository.js";
import { SubmissionId } from "../domain/submission-id.js";
import type {
  GradingStatus,
  IntegrityFlags,
  Submission,
  SubmissionEndReason,
} from "../domain/submission.js";
import {
  AlreadySubmittedError,
  ExamShareNotFoundError,
  InvalidAnswersError,
  SubmissionSessionNotFoundError,
} from "../domain/submission-errors.js";

/**
 * Hook fire-and-forget pra eventos de submissão. Implementação real é o
 * `DispatchSubmissionCompletedUseCase` do domain `webhook-dispatch`. O
 * use case fica desacoplado: aceita undefined em ambientes de teste/dev
 * sem webhook. NÃO bloqueia a request — chame sem await.
 */
export interface SubmissionEventDispatcher {
  dispatch(submission: Submission): Promise<void>;
}

// Grace de 30s pra compensar latência de rede no auto-submit quando o tempo estoura.
const TIME_GRACE_SECONDS = 30;

interface Input {
  shareId: string;
  submissionId: string;
  answers: Array<number | null>;
  /** Respostas digitadas das discursivas, alinhadas por índice de questão. */
  textAnswers?: Array<string | null>;
  endReason: SubmissionEndReason;
  integrityFlags?: Partial<IntegrityFlags>;
}

export interface SubmitExamOutput {
  id: string;
  score: number;
  correctCount: number;
  questionCount: number;
  endReason: SubmissionEndReason;
  /** "pending" quando há discursivas aguardando correção. */
  gradingStatus: GradingStatus;
  questionResults: Array<{
    type: QuestionType;
    correctAnswer: number;
    explanation: string;
  }>;
}

/**
 * Finaliza uma submissão que foi iniciada por BeginExamUseCase.
 * - Valida que o submissionId pertence a essa prova.
 * - Valida tempo no servidor (startedAt + duration + grace).
 * - Força endReason=time_expired se passou do tempo, mesmo que o cliente
 *   tenha mandado "submitted".
 * - Aceita integrityFlags do cliente (best-effort — cliente pode mentir,
 *   mas a gente usa só pra observabilidade, não pra nota).
 */
export class SubmitExamUseCase {
  constructor(
    private readonly exams: ExamRepository,
    private readonly submissions: SubmissionRepository,
    /** Opcional pra preservar testes existentes; em produção sempre wired. */
    private readonly dispatcher?: SubmissionEventDispatcher,
  ) {}

  async execute(input: Input): Promise<SubmitExamOutput> {
    const exam = await this.exams.findByShareId(input.shareId);
    if (!exam) throw new ExamShareNotFoundError();

    const submission = await this.submissions.findById(
      SubmissionId.of(input.submissionId),
    );
    if (!submission || submission.examId !== exam.id.toString()) {
      throw new SubmissionSessionNotFoundError();
    }
    if (submission.status === "submitted") {
      throw new AlreadySubmittedError();
    }

    if (input.answers.length !== exam.questions.length) {
      throw new InvalidAnswersError(
        `Número de respostas (${input.answers.length}) não bate com o número de questões (${exam.questions.length}).`,
      );
    }

    // Validação server-side de tempo: se passou da deadline + grace, força
    // time_expired mesmo que o cliente tenha mandado submitted.
    let finalEndReason = input.endReason;
    if (exam.duration > 0) {
      const elapsedSeconds =
        (Date.now() - submission.startedAt.getTime()) / 1000;
      const maxSeconds = exam.duration * 60 + TIME_GRACE_SECONDS;
      if (elapsedSeconds > maxSeconds && finalEndReason === "submitted") {
        finalEndReason = "time_expired";
      }
    }

    const correctAnswers = exam.questions.map((q) => q.correctAnswer);
    const openQuestionIndices = exam.questions
      .map((q, i) => (q.type === "open" ? i : -1))
      .filter((i) => i >= 0);
    submission.finalize({
      answers: input.answers,
      textAnswers: input.textAnswers,
      correctAnswers,
      openQuestionIndices,
      endReason: finalEndReason,
      integrityFlags: input.integrityFlags,
    });

    await this.submissions.save(submission);

    // Fire-and-forget: erros do dispatcher não devem afetar a resposta
    // ao aluno. O dispatcher loga internamente.
    // Só dispara `submission.completed` quando a nota é final — provas com
    // discursivas ainda pendentes disparam após a aprovação da correção (Fase 2).
    if (this.dispatcher && submission.gradingStatus !== "pending") {
      this.dispatcher.dispatch(submission).catch(() => undefined);
    }

    return {
      id: submission.id.toString(),
      score: submission.score,
      correctCount: submission.correctCount,
      questionCount: submission.questionCount,
      endReason: finalEndReason,
      gradingStatus: submission.gradingStatus,
      questionResults: exam.questions.map((q) => ({
        type: q.type,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    };
  }
}
