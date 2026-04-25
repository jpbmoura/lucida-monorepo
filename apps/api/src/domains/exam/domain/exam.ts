import { ExamId } from "./exam-id.js";
import { Question } from "./question.js";
import {
  ExamQuestionsInvalidError,
  ExamTitleInvalidError,
} from "./exam-errors.js";

const TITLE_MIN = 2;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 500;
const DURATION_MIN = 0;
const DURATION_MAX = 600;

export type ExamStyle = "simple" | "contextual" | "analytical" | "reflective";
/**
 * "off"    — sem bloqueios; aluno pode sair da aba, copiar texto, etc.
 * "strict" — escuta visibilitychange/blur, bloqueia right-click e copy,
 *            auto-finaliza no 3º strike, marca flags no Submission.
 */
export type SecurityLevel = "off" | "strict";

export interface ExamUsage {
  inputTokens: number;
  outputTokens: number;
  credits: number;
}

export interface ExamProps {
  id: ExamId;
  classId: string;
  ownerId: string;
  title: string;
  description: string;
  style: ExamStyle;
  duration: number; // minutos, 0 = sem limite
  securityLevel: SecurityLevel;
  questions: Question[];
  shareId: string;
  usage: ExamUsage | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Exam {
  private constructor(private props: ExamProps) {}

  static create(input: {
    id: ExamId;
    classId: string;
    ownerId: string;
    title: string;
    description?: string;
    style: ExamStyle;
    duration?: number;
    securityLevel?: SecurityLevel;
    questions: Question[];
    shareId: string;
    usage?: ExamUsage | null;
    now?: Date;
  }): Exam {
    const title = validateTitle(input.title);
    const description = validateDescription(input.description ?? "");
    const duration = validateDuration(input.duration ?? 0);
    if (input.questions.length === 0) {
      throw new ExamQuestionsInvalidError("Prova precisa de ao menos 1 questão.");
    }
    const now = input.now ?? new Date();
    return new Exam({
      id: input.id,
      classId: input.classId,
      ownerId: input.ownerId,
      title,
      description,
      style: input.style,
      duration,
      securityLevel: input.securityLevel ?? "off",
      questions: input.questions,
      shareId: input.shareId,
      usage: input.usage ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ExamProps): Exam {
    return new Exam({ ...props, questions: [...props.questions] });
  }

  get id(): ExamId {
    return this.props.id;
  }
  get classId(): string {
    return this.props.classId;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get title(): string {
    return this.props.title;
  }
  get description(): string {
    return this.props.description;
  }
  get style(): ExamStyle {
    return this.props.style;
  }
  get duration(): number {
    return this.props.duration;
  }
  get securityLevel(): SecurityLevel {
    return this.props.securityLevel;
  }
  get questions(): Question[] {
    return [...this.props.questions];
  }
  get shareId(): string {
    return this.props.shareId;
  }
  get usage(): ExamUsage | null {
    return this.props.usage;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  rename(newTitle: string, now: Date = new Date()): void {
    this.props.title = validateTitle(newTitle);
    this.props.updatedAt = now;
  }

  updateDescription(newDescription: string, now: Date = new Date()): void {
    this.props.description = validateDescription(newDescription);
    this.props.updatedAt = now;
  }

  updateDuration(newDuration: number, now: Date = new Date()): void {
    this.props.duration = validateDuration(newDuration);
    this.props.updatedAt = now;
  }

  updateSecurityLevel(level: SecurityLevel, now: Date = new Date()): void {
    this.props.securityLevel = level;
    this.props.updatedAt = now;
  }

  replaceQuestions(questions: Question[], now: Date = new Date()): void {
    if (questions.length === 0) {
      throw new ExamQuestionsInvalidError("Prova precisa de ao menos 1 questão.");
    }
    this.props.questions = [...questions];
    this.props.updatedAt = now;
  }

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }
}

function validateTitle(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < TITLE_MIN) {
    throw new ExamTitleInvalidError(`Título precisa ter ao menos ${TITLE_MIN} caracteres.`);
  }
  if (trimmed.length > TITLE_MAX) {
    throw new ExamTitleInvalidError(`Título não pode passar de ${TITLE_MAX} caracteres.`);
  }
  return trimmed;
}

function validateDescription(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length > DESCRIPTION_MAX) {
    throw new ExamTitleInvalidError(
      `Descrição não pode passar de ${DESCRIPTION_MAX} caracteres.`,
    );
  }
  return trimmed;
}

function validateDuration(value: number): number {
  if (!Number.isFinite(value) || value < DURATION_MIN || value > DURATION_MAX) {
    throw new ExamTitleInvalidError(
      `Duração deve estar entre ${DURATION_MIN} e ${DURATION_MAX} minutos.`,
    );
  }
  return Math.floor(value);
}
