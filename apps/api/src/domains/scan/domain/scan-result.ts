import { ScanId } from "./scan-id.js";
import { ScanCannotBeApprovedError } from "./scan-errors.js";

export type ScanReviewStatus = "auto_approved" | "pending" | "approved" | "rejected";

/**
 * Respostas vindas do OMR: por questão, a letra marcada ("A".."E") ou
 * null quando a bolha está em branco. Questões com múltiplas marcações
 * também viram null (problemáticas) e são listadas em multiMarkedQuestions.
 */
export type DetectedAnswer = string | null;

export interface ScanProps {
  id: ScanId;
  examId: string;
  classId: string;
  ownerId: string;
  /** Código de 7 dígitos detectado na folha; string vazia quando falhou. */
  studentCode: string;
  studentCodeValid: boolean;
  studentCodeInvalidReason: string | null;
  /**
   * ID do aluno resolvido a partir do studentCode + classId no momento
   * do scan. Null quando não casou com nenhum aluno da turma.
   */
  studentId: string | null;
  /** Nome do aluno (snapshot) — só preenchido quando studentId != null. */
  studentName: string | null;
  /** Índice = número da questão - 1; valor = letra marcada ou null. */
  answers: DetectedAnswer[];
  correctCount: number;
  questionCount: number;
  /** Nota 0..10 com 1 casa. */
  score: number;
  /** Números de questões (1-based) com mais de uma marca. */
  multiMarkedQuestions: number[];
  /** Números de questões (1-based) em branco. */
  unmarkedQuestions: number[];
  imageQuality: "good" | "fair" | "poor";
  processingTimeMs: number;
  requiresReview: boolean;
  /** Motivos legíveis pro professor (ex: "Código inválido: ...", "Aluno já enviou online"). */
  reviewReasons: string[];
  reviewStatus: ScanReviewStatus;
  scannedAt: Date;
}

/**
 * ScanResult é uma digitalização de folha OMR, com lifecycle simples:
 * - "auto_approved" — limpa; deve virar Submission automaticamente.
 * - "pending"       — problemática; precisa review manual antes de aprovar.
 * - "approved"      — professor aprovou manualmente (e já virou Submission).
 * - "rejected"      — professor descartou explicitamente.
 *
 * A folha em si não é persistida — a gente guarda só o resultado estruturado
 * do OMR. Se o professor quiser reprocessar, digitaliza de novo.
 */
export class ScanResult {
  private constructor(private props: ScanProps) {}

  static create(input: {
    id: ScanId;
    examId: string;
    classId: string;
    ownerId: string;
    studentCode: string;
    studentCodeValid: boolean;
    studentCodeInvalidReason: string | null;
    studentId: string | null;
    studentName: string | null;
    answers: DetectedAnswer[];
    correctCount: number;
    questionCount: number;
    score: number;
    multiMarkedQuestions: number[];
    unmarkedQuestions: number[];
    imageQuality: "good" | "fair" | "poor";
    processingTimeMs: number;
    reviewReasons: string[];
    now?: Date;
  }): ScanResult {
    const requiresReview = input.reviewReasons.length > 0;
    const reviewStatus: ScanReviewStatus = requiresReview ? "pending" : "auto_approved";
    return new ScanResult({
      id: input.id,
      examId: input.examId,
      classId: input.classId,
      ownerId: input.ownerId,
      studentCode: input.studentCode,
      studentCodeValid: input.studentCodeValid,
      studentCodeInvalidReason: input.studentCodeInvalidReason,
      studentId: input.studentId,
      studentName: input.studentName,
      answers: [...input.answers],
      correctCount: input.correctCount,
      questionCount: input.questionCount,
      score: input.score,
      multiMarkedQuestions: [...input.multiMarkedQuestions],
      unmarkedQuestions: [...input.unmarkedQuestions],
      imageQuality: input.imageQuality,
      processingTimeMs: input.processingTimeMs,
      requiresReview,
      reviewReasons: [...input.reviewReasons],
      reviewStatus,
      scannedAt: input.now ?? new Date(),
    });
  }

  static restore(props: ScanProps): ScanResult {
    return new ScanResult({
      ...props,
      answers: [...props.answers],
      multiMarkedQuestions: [...props.multiMarkedQuestions],
      unmarkedQuestions: [...props.unmarkedQuestions],
      reviewReasons: [...props.reviewReasons],
    });
  }

  get id(): ScanId {
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
  get studentCode(): string {
    return this.props.studentCode;
  }
  get studentCodeValid(): boolean {
    return this.props.studentCodeValid;
  }
  get studentCodeInvalidReason(): string | null {
    return this.props.studentCodeInvalidReason;
  }
  get studentId(): string | null {
    return this.props.studentId;
  }
  get studentName(): string | null {
    return this.props.studentName;
  }
  get answers(): DetectedAnswer[] {
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
  get multiMarkedQuestions(): number[] {
    return [...this.props.multiMarkedQuestions];
  }
  get unmarkedQuestions(): number[] {
    return [...this.props.unmarkedQuestions];
  }
  get imageQuality(): "good" | "fair" | "poor" {
    return this.props.imageQuality;
  }
  get processingTimeMs(): number {
    return this.props.processingTimeMs;
  }
  get requiresReview(): boolean {
    return this.props.requiresReview;
  }
  get reviewReasons(): string[] {
    return [...this.props.reviewReasons];
  }
  get reviewStatus(): ScanReviewStatus {
    return this.props.reviewStatus;
  }
  get scannedAt(): Date {
    return this.props.scannedAt;
  }

  /** Marca como aprovado (foi manual). */
  markApproved(): void {
    if (this.props.reviewStatus === "approved" || this.props.reviewStatus === "auto_approved") {
      return;
    }
    if (this.props.reviewStatus === "rejected") {
      throw new ScanCannotBeApprovedError("Digitalização já foi rejeitada.");
    }
    this.props.reviewStatus = "approved";
  }

  markRejected(): void {
    this.props.reviewStatus = "rejected";
  }

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }

  /**
   * Pode virar Submission? Precisa de aluno resolvido + status aprovado
   * (auto ou manual).
   */
  canBecomeSubmission(): boolean {
    if (!this.props.studentId) return false;
    return (
      this.props.reviewStatus === "auto_approved" ||
      this.props.reviewStatus === "approved"
    );
  }
}
