import { DomainError } from "@/shared/errors/domain-error.js";

export class OrganizationPreferencesNotFoundError extends DomainError {
  readonly code = "ORG_PREFERENCES_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Preferências da organização não encontradas.");
  }
}

export class InvalidMatriculaScopeError extends DomainError {
  readonly code = "INVALID_MATRICULA_SCOPE";
  readonly statusCode = 400;
  constructor(value: string) {
    super(
      `matriculaScope inválido: "${value}". Valores aceitos: "teacher" ou "organization".`,
    );
  }
}
