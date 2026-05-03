import { DomainError } from "@/shared/errors/domain-error.js";

export class CannotImpersonateSelfError extends DomainError {
  readonly code = "CANNOT_IMPERSONATE_SELF";
  readonly statusCode = 400;
  constructor() {
    super("Você não pode atuar como você mesmo.");
  }
}

export class ImpersonateTargetNotFoundError extends DomainError {
  readonly code = "IMPERSONATE_TARGET_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Usuário alvo não encontrado.");
  }
}

/**
 * Tentativa de impersonar uma instituição que não tem owner. Não
 * resolvemos pra outro role automaticamente — staff precisa promover
 * alguém antes pra impersonate funcionar.
 */
export class InstitutionWithoutOwnerError extends DomainError {
  readonly code = "INSTITUTION_WITHOUT_OWNER";
  readonly statusCode = 409;
  constructor() {
    super("Instituição sem owner. Promova alguém antes de atuar como.");
  }
}
