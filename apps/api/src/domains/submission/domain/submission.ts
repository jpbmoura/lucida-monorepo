import { SubmissionId } from "./submission-id.js";
import { OpenGrade } from "./open-grade.js";
import { InvalidAnswersError, OpenGradeInvalidError } from "./submission-errors.js";

export type SubmissionStatus = "in_progress" | "submitted";

/**
 * Estado da correção das questões discursivas da submissão.
 * - "not_required"     — prova sem discursivas; a nota já é final no submit.
 * - "pending"          — tem discursiva(s) não corrigida(s); o `score` é parcial
 *                        (só conta as objetivas) até a correção fechar.
 * - "partially_graded" — algumas discursivas corrigidas, outras não.
 * - "graded"           — todas as discursivas corrigidas e aprovadas; nota final.
 */
export type GradingStatus =
  | "not_required"
  | "pending"
  | "partially_graded"
  | "graded";

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
  /**
   * Snapshot de `exam.courseId`. Obrigatório (Fase 4+). Backfill em
   * `scripts/backfill-courses/` populou os legacy.
   */
  courseId: string;
  ownerId: string; // dono da prova (professor) — usado pra listagem
  studentId: string;
  studentCode: string;
  studentName: string; // snapshot no momento do começo
  source: SubmissionSource;
  status: SubmissionStatus;
  answers: Array<number | null>; // índice da opção escolhida; null = em branco
  /**
   * Resposta digitada das questões discursivas, alinhada por índice de questão.
   * null nas posições objetivas ou discursivas deixadas em branco.
   */
  textAnswers: Array<string | null>;
  correctCount: number;
  questionCount: number;
  score: number; // 0..10 (1 casa decimal); 0 enquanto in_progress
  startedAt: Date;
  submittedAt: Date | null;
  endReason: SubmissionEndReason | null;
  integrityFlags: IntegrityFlags;
  /** Índices das questões discursivas (precisam de correção). [] = prova objetiva. */
  openQuestionIndices: number[];
  /** Notas das discursivas (correção manual ou IA). */
  openGrades: OpenGrade[];
  gradingStatus: GradingStatus;
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
    courseId: string;
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
      courseId: input.courseId,
      ownerId: input.ownerId,
      studentId: input.studentId,
      studentCode: input.studentCode,
      studentName: input.studentName,
      source: "online",
      status: "in_progress",
      answers: Array.from({ length: input.questionCount }, () => null),
      textAnswers: Array.from({ length: input.questionCount }, () => null),
      correctCount: 0,
      questionCount: input.questionCount,
      score: 0,
      startedAt: now,
      submittedAt: null,
      endReason: null,
      integrityFlags: emptyIntegrityFlags(),
      openQuestionIndices: [],
      openGrades: [],
      gradingStatus: "not_required",
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
    courseId: string;
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
      courseId: input.courseId,
      ownerId: input.ownerId,
      studentId: input.studentId,
      studentCode: input.studentCode,
      studentName: input.studentName,
      source: input.source,
      status: "submitted",
      answers: [...input.answers],
      // Scanner é sempre objetivo (OMR não lê texto), logo sem respostas digitadas.
      textAnswers: Array.from({ length: questionCount }, () => null),
      correctCount,
      questionCount,
      score,
      startedAt: input.at,
      submittedAt: input.at,
      endReason: "submitted",
      integrityFlags: emptyIntegrityFlags(),
      openQuestionIndices: [],
      openGrades: [],
      gradingStatus: "not_required",
    });
  }

  static restore(props: SubmissionProps): Submission {
    return new Submission({
      ...props,
      answers: [...props.answers],
      textAnswers: [...props.textAnswers],
      integrityFlags: { ...props.integrityFlags },
      openQuestionIndices: [...props.openQuestionIndices],
      openGrades: [...props.openGrades],
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
  get courseId(): string {
    return this.props.courseId;
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
  get textAnswers(): Array<string | null> {
    return [...this.props.textAnswers];
  }
  get openQuestionIndices(): number[] {
    return [...this.props.openQuestionIndices];
  }
  get openGrades(): OpenGrade[] {
    return [...this.props.openGrades];
  }
  get gradingStatus(): GradingStatus {
    return this.props.gradingStatus;
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
    /** Respostas digitadas das discursivas, alinhadas por índice. */
    textAnswers?: Array<string | null>;
    correctAnswers: number[];
    /** Índices das discursivas — score fica parcial (só objetivas) até a correção. */
    openQuestionIndices?: number[];
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

    this.props.status = "submitted";
    this.props.answers = [...input.answers];
    if (input.textAnswers) {
      // Normaliza pro tamanho da prova; texto só-espaço vira null (em branco).
      // Sem limite de tamanho (decisão de produto v1).
      this.props.textAnswers = Array.from(
        { length: this.props.questionCount },
        (_, i) => {
          const t = input.textAnswers?.[i];
          return typeof t === "string" && t.trim().length > 0 ? t : null;
        },
      );
    }
    this.props.correctCount = correctCount;
    this.props.openQuestionIndices = [...(input.openQuestionIndices ?? [])];
    this.props.submittedAt = input.now ?? new Date();
    this.props.endReason = input.endReason;
    if (input.integrityFlags) {
      this.props.integrityFlags = {
        ...this.props.integrityFlags,
        ...input.integrityFlags,
      };
    }
    // Score (objetivas + frações das discursivas aprovadas) e gradingStatus.
    this.recomputeGrading();
  }

  /**
   * Aplica/atualiza as notas das questões discursivas (upsert por índice),
   * recompondo a nota e o `gradingStatus`. Idempotente por questão — permite
   * correção incremental e re-correção.
   */
  applyOpenGrades(grades: OpenGrade[], _now: Date = new Date()): void {
    const allowed = new Set(this.props.openQuestionIndices);
    for (const g of grades) {
      if (!allowed.has(g.questionIndex)) {
        throw new OpenGradeInvalidError(
          `Questão ${g.questionIndex + 1} não é discursiva nesta prova.`,
        );
      }
    }
    const byIndex = new Map(
      this.props.openGrades.map((g) => [g.questionIndex, g]),
    );
    for (const g of grades) byIndex.set(g.questionIndex, g);
    this.props.openGrades = [...byIndex.values()].sort(
      (a, b) => a.questionIndex - b.questionIndex,
    );
    this.recomputeGrading();
  }

  /**
   * Aprova os rascunhos da IA (`ai_suggested` → `approved`), registrando quem
   * aprovou. Só grades aprovadas entram na nota — então isto fecha a correção.
   * Human-in-the-loop: o professor tem a palavra final.
   */
  approveOpenGrades(approverUserId: string, now: Date = new Date()): void {
    this.props.openGrades = this.props.openGrades.map((g) =>
      g.status === "ai_suggested"
        ? OpenGrade.create({
            ...g.toJSON(),
            status: "approved",
            gradedByUserId: approverUserId,
            gradedAt: now,
          })
        : g,
    );
    this.recomputeGrading();
  }

  /**
   * Recompõe `score` e `gradingStatus`. Nota = (acertos objetivos + Σ frações
   * das discursivas APROVADAS) / total de questões × 10. Fórmula idêntica à
   * histórica; a única diferença é que discursivas contribuem fração ∈ [0,1].
   */
  private recomputeGrading(): void {
    const approved = this.props.openGrades.filter(
      (g) => g.status === "approved",
    );
    const openFraction = approved.reduce((sum, g) => sum + g.fraction(), 0);
    const earnedPoints = this.props.correctCount + openFraction;
    this.props.score =
      this.props.questionCount === 0
        ? 0
        : Math.round((earnedPoints / this.props.questionCount) * 100) / 10;

    const total = this.props.openQuestionIndices.length;
    if (total === 0) {
      this.props.gradingStatus = "not_required";
      return;
    }
    const approvedIndices = new Set(approved.map((g) => g.questionIndex));
    const done = this.props.openQuestionIndices.filter((i) =>
      approvedIndices.has(i),
    ).length;
    this.props.gradingStatus =
      done === 0 ? "pending" : done < total ? "partially_graded" : "graded";
  }

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }
}
