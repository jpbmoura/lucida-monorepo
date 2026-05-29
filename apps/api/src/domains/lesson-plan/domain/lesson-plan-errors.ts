import { DomainError } from "@/shared/errors/domain-error.js";

export class LessonPlanNotFoundError extends DomainError {
  readonly code = "LESSON_PLAN_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Plano de aula não encontrado.");
  }
}

export class LessonPlanTitleInvalidError extends DomainError {
  readonly code = "LESSON_PLAN_TITLE_INVALID";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}
