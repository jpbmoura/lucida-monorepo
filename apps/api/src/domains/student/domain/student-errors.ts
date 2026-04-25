import { DomainError } from "@/shared/errors/domain-error.js";

export class StudentNotFoundError extends DomainError {
  readonly code = "STUDENT_NOT_FOUND";
  readonly statusCode = 404;

  constructor() {
    super("Aluno não encontrado.");
  }
}

export class StudentNameInvalidError extends DomainError {
  readonly code = "STUDENT_NAME_INVALID";
  readonly statusCode = 400;

  constructor(reason: string) {
    super(reason);
  }
}

export class StudentMatriculaInvalidError extends DomainError {
  readonly code = "STUDENT_MATRICULA_INVALID";
  readonly statusCode = 400;

  constructor(reason: string) {
    super(reason);
  }
}

export class DuplicateMatriculaError extends DomainError {
  readonly code = "STUDENT_DUPLICATE_MATRICULA";
  readonly statusCode = 409;

  constructor() {
    super("Já existe um aluno com essa matrícula.");
  }
}

export class StudentCodeExhaustedError extends DomainError {
  readonly code = "STUDENT_CODE_EXHAUSTED";
  readonly statusCode = 500;

  constructor() {
    super("Não foi possível gerar um código único para o aluno após várias tentativas.");
  }
}
