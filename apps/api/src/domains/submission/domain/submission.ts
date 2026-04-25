import { SubmissionId } from "./submission-id.js";
import { InvalidAnswersError } from "./submission-errors.js";

export type SubmissionStatus = "in_progress" | "submitted";

/**
 * Origem da submissão.
 * - "online"  — aluno respondeu pela URL pública (fluxo normal start/finalize).
 * - "scanner" — folha física digitalizada pelo OMR. Criada já finalizada, sem
 *               lifecycle in_progress (não há momento "começou" — a prova já
 *               aconteceu no papel).
 */
export type SubmissionSource = "online" | "scanner";

/**
 * Por que a prova terminou:
 * - "submitted"     — aluno clicou enviar (ou, pra scanner, folha processada).
 * - "time_expired"  — duração estourou, client ou server fechou.
 * - "violation"     — modo estrito detectou violação (auto-finalização).
 * - "abandoned"     — iniciada e nunca fechada (não usado em run-time;
 *                     placeholder pra eventual job de limpeza).
 */
export type SubmissionEndReason =
  | "submitted"
  | "time_expired"
  | "violation"
  | "abandoned";

export interface IntegrityFlags {
  tabSwitches: number;
  focusLosses: number;
  copyAttempts: number;
  rightClickAttempts: number;
  violationCount: number;
}

export function emptyIntegrityFlags(): IntegrityFlags {
  return {
    tabSwitches: 0,
    focusLosses: 0,
    copyAttempts: 0,
    rightClickAttempts: 0,
    violationCount: 0,
  };
}

export interface SubmissionProps {
  id: SubmissionId;
  examId: string;
  classId: string;
  ownerId: string; // dono da prova (professor) — usado pra listagem
  studentId: string;
  studentCode: string;
  studentName: string; // snapshot no momento do começo
  source: SubmissionSource;
  status: SubmissionStatus;
  answers: Array<number | null>; // índice da opção escolhida; null = em branco
  correctCount: number;
  questionCount: number;
  score: number; // 0..10 (1 casa decimal); 0 enquanto in_progress
  startedAt: Date;
  submittedAt: Date | null;
  endReason: SubmissionEndReason | null;
  integrityFlags: IntegrityFlags;
}

export class Submission {
  private constructor(private props: SubmissionProps) {}

  /**
   * Inicia uma submissão. Status "in_progress", sem respostas, sem score.
   * Snapshotta o nome do aluno no momento do início.
   */
  static start(input: {
    id: SubmissionId;
    examId: string;
    classId: string;
    ownerId: string;
    studentId: string;
    studentCode: string;
    studentName: string;
    questionCount: number;
    now?: Date;
  }): Submission {
    const now = input.now ?? new Date();
    return new Submission({
      id: input.id,
      examId: input.examId,
      classId: input.classId,
      ownerId: input.ownerId,
      studentId: input.studentId,
      studentCode: input.studentCode,
      studentName: input.studentName,
      source: "online",
      status: "in_progress",
      answers: Array.from({ length: input.questionCount }, () => null),
      correctCount: 0,
      questionCount: input.questionCount,
      score: 0,
      startedAt: now,
      submittedAt: null,
      endReason: null,
      integrityFlags: emptyIntegrityFlags(),
    });
  }

  /**
   * Cria uma submissão já finalizada (caso do scanner).
   * Não passa por in_progress — a prova aconteceu em papel e a folha só
   * foi digitalizada; não há momento "começou".
   */
  static completed(input: {
    id: SubmissionId;
    examId: string;
    classId: string;
    ownerId: string;
    studentId: string;
    studentCode: string;
    studentName: string;
    source: SubmissionSource;
    answers: Array<number | null>;
    correctAnswers: number[];
    at: Date;
  }): Submission {
    if (input.answers.length !== input.correctAnswers.length) {
      throw new InvalidAnswersError(
        `Número de respostas (${input.answers.length}) não bate com o número de questões (${input.correctAnswers.length}).`,
      );
    }
    let correctCount = 0;
    for (let i = 0; i < input.answers.length; i++) {
      const a = input.answers[i];
      if (a === null || a === undefined) continue;
      if (a === input.correctAnswers[i]) correctCount++;
    }
    const questionCount = input.answers.length;
    const score =
      questionCount === 0
        ? 0
        : Math.round((correctCount / questionCount) * 100) / 10;

    return new Submission({
      id: input.id,
      examId: input.examId,
      classId: input.classId,
      ownerId: input.ownerId,
      studentId: input.studentId,
      studentCode: input.studentCode,
      studentName: input.studentName,
      source: input.source,
      status: "submitted",
      answers: [...input.answers],
      correctCount,
      questionCount,
      score,
      startedAt: input.at,
      submittedAt: input.at,
      endReason: "submitted",
      integrityFlags: emptyIntegrityFlags(),
    });
  }

  static restore(props: SubmissionProps): Submission {
    return new Submission({
      ...props,
      answers: [...props.answers],
      integrityFlags: { ...props.integrityFlags },
    });
  }

  get id(): SubmissionId {
    return this.props.id;
  }
  get examId(): string {
    return this.props.examId;
  }
  get classId(): string {
    return this.props.classId;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get studentId(): string {
    return this.props.studentId;
  }
  get studentCode(): string {
    return this.props.studentCode;
  }
  get studentName(): string {
    return this.props.studentName;
  }
  get source(): SubmissionSource {
    return this.props.source;
  }
  get status(): SubmissionStatus {
    return this.props.status;
  }
  get answers(): Array<number | null> {
    return [...this.props.answers];
  }
  get correctCount(): number {
    return this.props.correctCount;
  }
  get questionCount(): number {
    return this.props.questionCount;
  }
  get score(): number {
    return this.props.score;
  }
  get startedAt(): Date {
    return this.props.startedAt;
  }
  get submittedAt(): Date | null {
    return this.props.submittedAt;
  }
  get endReason(): SubmissionEndReason | null {
    return this.props.endReason;
  }
  get integrityFlags(): IntegrityFlags {
    return { ...this.props.integrityFlags };
  }

  /**
   * Finaliza a submissão. Valida respostas, calcula score, marca endReason
   * e integrity flags. Só permitido se status === "in_progress".
   */
  finalize(input: {
    answers: Array<number | null>;
    correctAnswers: number[];
    endReason: SubmissionEndReason;
    integrityFlags?: Partial<IntegrityFlags>;
    now?: Date;
  }): void {
    if (this.props.status !== "in_progress") {
      throw new InvalidAnswersError("Submissão já foi finalizada.");
    }
    if (input.answers.length !== input.correctAnswers.length) {
      throw new InvalidAnswersError(
        `Número de respostas (${input.answers.length}) não bate com o número de questões (${input.correctAnswers.length}).`,
      );
    }
    if (input.answers.length !== this.props.questionCount) {
      throw new InvalidAnswersError(
        `Número de respostas não bate com o que foi iniciado.`,
      );
    }

    let correctCount = 0;
    for (let i = 0; i < input.answers.length; i++) {
      const answer = input.answers[i];
      if (answer === null || answer === undefined) continue;
      if (!Number.isInteger(answer) || answer < 0) {
        throw new InvalidAnswersError(
          `Resposta inválida na questão ${i + 1}: índice ${answer} fora do intervalo.`,
        );
      }
      if (answer === input.correctAnswers[i]) correctCount++;
    }

    const score =
      this.props.questionCount === 0
        ? 0
        : Math.round((correctCount / this.props.questionCount) * 100) / 10;

    this.props.status = "submitted";
    this.props.answers = [...input.answers];
    this.props.correctCount = correctCount;
    this.props.score = score;
    this.props.submittedAt = input.now ?? new Date();
    this.props.endReason = input.endReason;
    if (input.integrityFlags) {
      this.props.integrityFlags = {
        ...this.props.integrityFlags,
        ...input.integrityFlags,
      };
    }
  }

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }
}
