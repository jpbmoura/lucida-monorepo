import { DomainError } from "@/shared/errors/domain-error.js";

export class ScanNotFoundError extends DomainError {
  readonly code = "SCAN_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Digitalização não encontrada.");
  }
}

export class OmrServiceError extends DomainError {
  readonly code = "OMR_SERVICE_ERROR";
  readonly statusCode = 502;
  constructor(reason: string) {
    super(reason);
  }
}

export class ScanAlreadyApprovedError extends DomainError {
  readonly code = "SCAN_ALREADY_APPROVED";
  readonly statusCode = 409;
  constructor() {
    super("Esta digitalização já foi aprovada.");
  }
}

export class ScanCannotBeApprovedError extends DomainError {
  readonly code = "SCAN_CANNOT_BE_APPROVED";
  readonly statusCode = 409;
  constructor(reason: string) {
    super(reason);
  }
}
