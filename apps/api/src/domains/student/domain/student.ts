import { StudentId } from "./student-id.js";
import { StudentCode } from "./student-code.js";
import {
  StudentMatriculaInvalidError,
  StudentNameInvalidError,
} from "./student-errors.js";

const NAME_MIN = 2;
const NAME_MAX = 120;
const MATRICULA_MIN = 1;
const MATRICULA_MAX = 40;

export interface StudentProps {
  id: StudentId;
  classId: string;
  ownerId: string;
  /**
   * Organização à qual o aluno pertence. `null` pra contas individuais
   * (professor sem org). Snapshot do momento da criação — não é
   * recalculado se o professor mudar de org depois.
   *
   * Usado quando `OrganizationPreferences.matriculaScope === "organization"`
   * pra garantir matrícula única em toda a org. Backfill via
   * `scripts/backfill-student-org/`.
   */
  organizationId: string | null;
  code: StudentCode;
  name: string;
  matricula: string;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Student {
  private constructor(private props: StudentProps) {}

  static create(input: {
    id: StudentId;
    classId: string;
    ownerId: string;
    organizationId?: string | null;
    code: StudentCode;
    name: string;
    matricula: string;
    email?: string | null;
    now?: Date;
  }): Student {
    const name = validateName(input.name);
    const matricula = validateMatricula(input.matricula);
    const email = normalizeEmail(input.email ?? null);
    const now = input.now ?? new Date();
    return new Student({
      id: input.id,
      classId: input.classId,
      ownerId: input.ownerId,
      organizationId: input.organizationId ?? null,
      code: input.code,
      name,
      matricula,
      email,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: StudentProps): Student {
    return new Student({ ...props });
  }

  get id(): StudentId {
    return this.props.id;
  }
  get classId(): string {
    return this.props.classId;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get organizationId(): string | null {
    return this.props.organizationId;
  }
  get code(): StudentCode {
    return this.props.code;
  }
  get name(): string {
    return this.props.name;
  }
  get matricula(): string {
    return this.props.matricula;
  }
  get email(): string | null {
    return this.props.email;
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

  updateMatricula(newMatricula: string, now: Date = new Date()): void {
    this.props.matricula = validateMatricula(newMatricula);
    this.props.updatedAt = now;
  }

  updateEmail(newEmail: string | null, now: Date = new Date()): void {
    this.props.email = normalizeEmail(newEmail);
    this.props.updatedAt = now;
  }

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }
}

function validateName(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < NAME_MIN) {
    throw new StudentNameInvalidError(`Nome precisa ter ao menos ${NAME_MIN} caracteres.`);
  }
  if (trimmed.length > NAME_MAX) {
    throw new StudentNameInvalidError(`Nome não pode passar de ${NAME_MAX} caracteres.`);
  }
  return trimmed;
}

function validateMatricula(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < MATRICULA_MIN) {
    throw new StudentMatriculaInvalidError("Matrícula é obrigatória.");
  }
  if (trimmed.length > MATRICULA_MAX) {
    throw new StudentMatriculaInvalidError(
      `Matrícula não pode passar de ${MATRICULA_MAX} caracteres.`,
    );
  }
  return trimmed;
}

function normalizeEmail(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}
