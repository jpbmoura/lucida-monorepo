import { DomainError } from "@/shared/errors/domain-error.js";

export class ClassNotFoundError extends DomainError {
  readonly code = "CLASS_NOT_FOUND";
  readonly statusCode = 404;

  constructor() {
    super("Turma não encontrada.");
  }
}

export class ClassNameInvalidError extends DomainError {
  readonly code = "CLASS_NAME_INVALID";
  readonly statusCode = 400;

  constructor(reason: string) {
    super(reason);
  }
}

export class ClassDescriptionInvalidError extends DomainError {
  readonly code = "CLASS_DESCRIPTION_INVALID";
  readonly statusCode = 400;

  constructor(reason: string) {
    super(reason);
  }
}
