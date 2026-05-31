import { DomainError } from "@/shared/errors/domain-error.js";

export class SlideDeckNotFoundError extends DomainError {
  readonly code = "SLIDE_DECK_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Apresentação não encontrada.");
  }
}

export class SlideDeckTitleInvalidError extends DomainError {
  readonly code = "SLIDE_DECK_TITLE_INVALID";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}

export class SlideDeckEmptyError extends DomainError {
  readonly code = "SLIDE_DECK_EMPTY";
  readonly statusCode = 400;
  constructor() {
    super("Uma apresentação precisa ter ao menos um slide.");
  }
}

export class SlideNotFoundError extends DomainError {
  readonly code = "SLIDE_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Slide não encontrado na apresentação.");
  }
}
