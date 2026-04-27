import { DomainError } from "@/shared/errors/domain-error.js";

export class CardNotFoundError extends DomainError {
  readonly code = "CARD_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Card não encontrado.");
  }
}

export class InvalidCardInputError extends DomainError {
  readonly code = "INVALID_CARD_INPUT";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}
