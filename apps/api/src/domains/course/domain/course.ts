import { CourseId } from "./course-id.js";
import {
  CourseDescriptionInvalidError,
  CourseNameInvalidError,
} from "./course-errors.js";

const NAME_MIN = 2;
const NAME_MAX = 120;
const DESCRIPTION_MAX = 200;

export interface CourseProps {
  id: CourseId;
  name: string;
  description: string;
  ownerId: string;
  /**
   * Org snapshot no momento da criação. `null` pra contas individuais
   * (professor sem org). Espelha o padrão de `class.organizationId`.
   */
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Course {
  private constructor(private props: CourseProps) {}

  static create(input: {
    id: CourseId;
    name: string;
    description?: string;
    ownerId: string;
    organizationId?: string | null;
    now?: Date;
  }): Course {
    const name = validateName(input.name);
    const description = validateDescription(input.description ?? "");
    const now = input.now ?? new Date();
    return new Course({
      id: input.id,
      name,
      description,
      ownerId: input.ownerId,
      organizationId: input.organizationId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: CourseProps): Course {
    return new Course({ ...props });
  }

  get id(): CourseId {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
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

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }
}

function validateName(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < NAME_MIN) {
    throw new CourseNameInvalidError(
      `Nome precisa ter ao menos ${NAME_MIN} caracteres.`,
    );
  }
  if (trimmed.length > NAME_MAX) {
    throw new CourseNameInvalidError(`Nome não pode passar de ${NAME_MAX} caracteres.`);
  }
  return trimmed;
}

function validateDescription(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length > DESCRIPTION_MAX) {
    throw new CourseDescriptionInvalidError(
      `Descrição não pode passar de ${DESCRIPTION_MAX} caracteres.`,
    );
  }
  return trimmed;
}
