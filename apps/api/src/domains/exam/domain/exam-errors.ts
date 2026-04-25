import { DomainError } from "@/shared/errors/domain-error.js";

export class ExamNotFoundError extends DomainError {
  readonly code = "EXAM_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Prova não encontrada.");
  }
}

export class ExamTitleInvalidError extends DomainError {
  readonly code = "EXAM_TITLE_INVALID";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}

export class ExamQuestionsInvalidError extends DomainError {
  readonly code = "EXAM_QUESTIONS_INVALID";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}
