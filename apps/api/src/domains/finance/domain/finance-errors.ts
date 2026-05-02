import { DomainError } from "@/shared/errors/domain-error.js";

export class ExpenseNotFoundError extends DomainError {
  readonly code = "EXPENSE_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Despesa não encontrada.");
  }
}

export class InvalidFinancePeriodError extends DomainError {
  readonly code = "INVALID_FINANCE_PERIOD";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}
