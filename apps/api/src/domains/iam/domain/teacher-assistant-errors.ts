import { DomainError } from "@/shared/errors/domain-error.js";

export class AssistantNotFoundError extends DomainError {
  readonly code = "ASSISTANT_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Auxiliar não encontrado.");
  }
}

export class AssistantTargetNotAvailableError extends DomainError {
  readonly code = "ASSISTANT_TARGET_NOT_AVAILABLE";
  readonly statusCode = 403;
  constructor() {
    super(
      "Você não tem permissão pra atender essa conta de professor.",
    );
  }
}

/**
 * Tentativa de entrar em modo "atuar como o próprio user" sem ter
 * vínculo nenhum de auxiliar. Sem vínculos não faz sentido carimbar
 * o cookie — o user já é o próprio user no fluxo normal.
 */
export class NotAnAssistantError extends DomainError {
  readonly code = "NOT_AN_ASSISTANT";
  readonly statusCode = 403;
  constructor() {
    super("Sua conta não está vinculada como auxiliar de nenhum professor.");
  }
}

/** Tentativa de criar dois vínculos ativos pro mesmo (assistant, teacher). */
export class AssistantAlreadyLinkedError extends DomainError {
  readonly code = "ASSISTANT_ALREADY_LINKED";
  readonly statusCode = 409;
  constructor() {
    super("Este auxiliar já está vinculado a este professor.");
  }
}

/** Professor alvo não pertence à org. */
export class TeacherNotInOrganizationError extends DomainError {
  readonly code = "TEACHER_NOT_IN_ORGANIZATION";
  readonly statusCode = 403;
  constructor() {
    super("Este professor não pertence à sua instituição.");
  }
}

export class InvalidAssistantInputError extends DomainError {
  readonly code = "INVALID_ASSISTANT_INPUT";
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
  }
}
