import { DomainError } from "@/shared/errors/domain-error.js";

export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  readonly statusCode = 401;

  constructor(message = "Autenticação necessária.") {
    super(message);
  }
}
