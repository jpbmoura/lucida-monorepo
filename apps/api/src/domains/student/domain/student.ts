import { randomUUID } from "node:crypto";
import { StudentId } from "./student-id.js";
import { StudentCode } from "./student-code.js";
import {
  StudentEmailInvalidError,
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
  /**
   * Snapshot do `class.courseId`. Obrigatório (Fase 4+). Backfill em
   * `scripts/backfill-courses/` populou os legacy.
   */
  courseId: string;
  code: StudentCode;
  name: string;
  matricula: string;
  email: string | null;
  /**
   * Id do aluno no roster do Google Classroom (userId do profile). `null`
   * para alunos cadastrados direto na Lucida. Usado pra detectar quem saiu
   * do Classroom numa reconciliação.
   */
  classroomUserId: string | null;
  /**
   * Marca de quando o aluno sumiu do roster do Classroom. `null` enquanto
   * presente. NÃO apagamos o aluno (pode ter provas feitas) — só sinalizamos.
   */
  classroomRemovedAt: Date | null;
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
    courseId: string;
    code: StudentCode;
    name: string;
    matricula: string;
    email?: string | null;
    classroomUserId?: string | null;
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
      courseId: input.courseId,
      code: input.code,
      name,
      matricula,
      email,
      classroomUserId: input.classroomUserId ?? null,
      classroomRemovedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: StudentProps): Student {
    return new Student({ ...props });
  }

  /**
   * Auto-cadastro do aluno no fluxo público da prova: ele entra com
   * email + nome (sem código). Geramos `code` (7 dígitos) e `matricula`
   * sintética automaticamente — colisão de `code` é tratada no save
   * (retry com novo `Student.selfRegister`). Email é obrigatório aqui.
   */
  static selfRegister(input: {
    id: StudentId;
    classId: string;
    ownerId: string;
    organizationId?: string | null;
    courseId: string;
    name: string;
    email: string;
    now?: Date;
  }): Student {
    const email = normalizeEmail(input.email);
    if (!email) {
      throw new StudentEmailInvalidError("Email é obrigatório.");
    }
    return Student.create({
      id: input.id,
      classId: input.classId,
      ownerId: input.ownerId,
      organizationId: input.organizationId ?? null,
      courseId: input.courseId,
      code: StudentCode.generate(),
      name: input.name,
      matricula: `auto-${randomUUID().slice(0, 12)}`,
      email,
      now: input.now,
    });
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
  get courseId(): string {
    return this.props.courseId;
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
  get classroomUserId(): string | null {
    return this.props.classroomUserId;
  }
  get classroomRemovedAt(): Date | null {
    return this.props.classroomRemovedAt;
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

  /**
   * Vincula o aluno ao seu userId no Google Classroom. Limpa qualquer
   * marca de saída anterior (reapareceu no roster).
   */
  linkClassroomUser(classroomUserId: string, now: Date = new Date()): void {
    this.props.classroomUserId = classroomUserId;
    this.props.classroomRemovedAt = null;
    this.props.updatedAt = now;
  }

  /**
   * Sinaliza que o aluno sumiu do roster do Classroom. Idempotente — não
   * mexe na marca se já estava marcado. Nunca apaga o aluno.
   */
  markDepartedFromClassroom(now: Date = new Date()): void {
    if (this.props.classroomRemovedAt !== null) return;
    this.props.classroomRemovedAt = now;
    this.props.updatedAt = now;
  }

  /** Limpa a marca de saída (aluno voltou ao roster). */
  restoreFromClassroom(now: Date = new Date()): void {
    if (this.props.classroomRemovedAt === null) return;
    this.props.classroomRemovedAt = null;
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
