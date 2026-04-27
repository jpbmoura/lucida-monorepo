import { ClassId } from "./class-id.js";
import {
  ClassDescriptionInvalidError,
  ClassGradeInvalidError,
  ClassNameInvalidError,
  ClassSubjectInvalidError,
} from "./class-errors.js";

const NAME_MIN = 2;
const NAME_MAX = 120;
const DESCRIPTION_MAX = 200;
const SUBJECT_MAX = 80;
const GRADE_MAX = 30;

export interface ClassProps {
  id: ClassId;
  name: string;
  description: string;
  /**
   * Disciplina principal (ex.: "Matemática"). Opcional — turmas legadas
   * que vieram da UI antes deste campo existir ficam null.
   */
  subject: string | null;
  /** Série/ano (ex.: "9", "3º EM"). Opcional. */
  grade: string | null;
  ownerId: string;
  /**
   * Org snapshot no momento da criação. `null` pra contas individuais
   * (professor sem org). Usado pelas rotas públicas pra filtrar turmas
   * da org da chave. Backfill via `scripts/backfill-class-org/`.
   */
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Class {
  private constructor(private props: ClassProps) {}

  static create(input: {
    id: ClassId;
    name: string;
    description?: string;
    subject?: string | null;
    grade?: string | null;
    ownerId: string;
    organizationId?: string | null;
    now?: Date;
  }): Class {
    const name = validateName(input.name);
    const description = validateDescription(input.description ?? "");
    const subject = validateSubject(input.subject ?? null);
    const grade = validateGrade(input.grade ?? null);
    const now = input.now ?? new Date();
    return new Class({
      id: input.id,
      name,
      description,
      subject,
      grade,
      ownerId: input.ownerId,
      organizationId: input.organizationId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ClassProps): Class {
    return new Class({ ...props });
  }

  get id(): ClassId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get subject(): string | null {
    return this.props.subject;
  }

  get grade(): string | null {
    return this.props.grade;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get organizationId(): string | null {
    return this.props.organizationId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  rename(newName: string, now: Date = new Date()): void {
    this.props.name = validateName(newName);
    this.props.updatedAt = now;
  }

  updateDescription(newDescription: string, now: Date = new Date()): void {
    this.props.description = validateDescription(newDescription);
    this.props.updatedAt = now;
  }

  updateSubject(newSubject: string | null, now: Date = new Date()): void {
    this.props.subject = validateSubject(newSubject);
    this.props.updatedAt = now;
  }

  updateGrade(newGrade: string | null, now: Date = new Date()): void {
    this.props.grade = validateGrade(newGrade);
    this.props.updatedAt = now;
  }

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }
}

function validateName(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < NAME_MIN) {
    throw new ClassNameInvalidError(`Nome precisa ter ao menos ${NAME_MIN} caracteres.`);
  }
  if (trimmed.length > NAME_MAX) {
    throw new ClassNameInvalidError(`Nome não pode passar de ${NAME_MAX} caracteres.`);
  }
  return trimmed;
}

function validateDescription(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length > DESCRIPTION_MAX) {
    throw new ClassDescriptionInvalidError(
      `Descrição não pode passar de ${DESCRIPTION_MAX} caracteres.`,
    );
  }
  return trimmed;
}

function validateSubject(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > SUBJECT_MAX) {
    throw new ClassSubjectInvalidError(
      `Disciplina não pode passar de ${SUBJECT_MAX} caracteres.`,
    );
  }
  return trimmed;
}

function validateGrade(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > GRADE_MAX) {
    throw new ClassGradeInvalidError(
      `Série/ano não pode passar de ${GRADE_MAX} caracteres.`,
    );
  }
  return trimmed;
}
