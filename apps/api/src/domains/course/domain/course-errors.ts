import { DomainError } from "@/shared/errors/domain-error.js";

export class CourseNotFoundError extends DomainError {
  readonly code = "COURSE_NOT_FOUND";
  readonly statusCode = 404;

  constructor() {
    super("Curso não encontrado.");
  }
}

export class CourseNameInvalidError extends DomainError {
  readonly code = "COURSE_NAME_INVALID";
  readonly statusCode = 400;

  constructor(reason: string) {
    super(reason);
  }
}

export class CourseDescriptionInvalidError extends DomainError {
  readonly code = "COURSE_DESCRIPTION_INVALID";
  readonly statusCode = 400;

  constructor(reason: string) {
    super(reason);
  }
}

export class CourseHasClassesError extends DomainError {
  readonly code = "COURSE_HAS_CLASSES";
  readonly statusCode = 409;

  constructor(public readonly classCount: number) {
    super(
      `Este curso ainda tem ${classCount} turma(s). Mova ou exclua antes de deletar o curso.`,
    );
  }
}
