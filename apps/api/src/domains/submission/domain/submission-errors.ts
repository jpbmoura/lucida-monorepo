import { DomainError } from "@/shared/errors/domain-error.js";

export class SubmissionNotFoundError extends DomainError {
  readonly code = "SUBMISSION_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Submissão não encontrada.");
  }
}

export class ExamShareNotFoundError extends DomainError {
  readonly code = "EXAM_SHARE_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Prova não encontrada ou link inválido.");
  }
}

export class StudentCodeNotFoundError extends DomainError {
  readonly code = "STUDENT_CODE_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Código do aluno não confere com nenhum cadastro desta turma.");
  }
}

export class InvalidAnswersError extends DomainError {
  readonly code = "INVALID_ANSWERS";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}

export class AlreadySubmittedError extends DomainError {
  readonly code = "ALREADY_SUBMITTED";
  readonly statusCode = 409;
  constructor() {
    super("Este aluno já enviou esta prova.");
  }
}

export class SubmissionSessionNotFoundError extends DomainError {
  readonly code = "SUBMISSION_SESSION_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Sessão da prova não encontrada. Comece a prova novamente.");
  }
}

export class SubmissionSessionExpiredError extends DomainError {
  readonly code = "SUBMISSION_SESSION_EXPIRED";
  readonly statusCode = 410;
  constructor() {
    super("Tempo da prova esgotado.");
  }
}

export class OpenGradeInvalidError extends DomainError {
  readonly code = "OPEN_GRADE_INVALID";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}

export class NotAnOpenQuestionError extends DomainError {
  readonly code = "NOT_AN_OPEN_QUESTION";
  readonly statusCode = 400;
  constructor() {
    super("Só questões discursivas podem ser corrigidas manualmente.");
  }
}
