import { DomainError } from "@/shared/errors/domain-error.js";

export class KintalUserNotFoundError extends DomainError {
  readonly code = "KINTAL_USER_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Usuário não encontrado.");
  }
}

export class InvalidCreditAdjustmentError extends DomainError {
  readonly code = "INVALID_CREDIT_ADJUSTMENT";
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
  }
}
