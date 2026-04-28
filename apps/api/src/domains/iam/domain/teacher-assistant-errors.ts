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

/** Tentativa de criar dois vínculos ativos pro mesmo (assistant, teacher). */
export class AssistantAlreadyLinkedError extends DomainError {
  readonly code = "ASSISTANT_ALREADY_LINKED";
  readonly statusCode = 409;
  constructor() {
    super("Este auxiliar já está vinculado a este professor.");
  }
}

/** Email do auxiliar já está em uso por outro user. */
export class AssistantEmailTakenError extends DomainError {
  readonly code = "ASSISTANT_EMAIL_TAKEN";
  readonly statusCode = 409;
  constructor(email: string) {
    super(`O email ${email} já está cadastrado.`);
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

/**
 * Auxiliares não podem executar essa ação — ex.: comprar créditos,
 * trocar senha, gerenciar outros auxiliares. Bloqueio aplicado por
 * middleware `denyAssistant`.
 */
export class AssistantActionForbiddenError extends DomainError {
  readonly code = "ASSISTANT_ACTION_FORBIDDEN";
  readonly statusCode = 403;
  constructor(message = "Esta ação não está disponível para auxiliares.") {
    super(message);
  }
}
