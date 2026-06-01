import { DomainError } from "@/shared/errors/domain-error.js";

/**
 * A integração não está configurada no servidor (faltam as envs
 * CLASSROOM_OAUTH_CLIENT_ID/SECRET ou CLASSROOM_TOKEN_ENC_KEY). 503 —
 * degradação graciosa, igual ao gating de Stripe/OMR.
 */
export class ClassroomNotConfiguredError extends DomainError {
  readonly code = "CLASSROOM_NOT_CONFIGURED";
  readonly statusCode = 503;
  constructor() {
    super(
      "Integração com o Google Classroom não configurada neste servidor.",
    );
  }
}

/** O professor ainda não conectou a conta Google da integração. */
export class ClassroomNotConnectedError extends DomainError {
  readonly code = "CLASSROOM_NOT_CONNECTED";
  readonly statusCode = 409;
  constructor() {
    super("Conecte sua conta Google do Classroom antes de continuar.");
  }
}

/**
 * O Google rejeitou o token (revogado/expirado sem refresh válido). O
 * professor precisa reconectar. Não derruba o resto da Lucida.
 */
export class ClassroomReauthRequiredError extends DomainError {
  readonly code = "CLASSROOM_REAUTH_REQUIRED";
  readonly statusCode = 409;
  constructor() {
    super(
      "O acesso ao Google Classroom expirou ou foi revogado. Reconecte a conta.",
    );
  }
}

/** O `state` do callback OAuth não confere (CSRF/adulteração/expirado). */
export class ClassroomInvalidOAuthStateError extends DomainError {
  readonly code = "CLASSROOM_INVALID_OAUTH_STATE";
  readonly statusCode = 400;
  constructor() {
    super("Estado de autorização inválido ou expirado.");
  }
}

/** Falha genérica ao chamar a API do Google Classroom. */
export class ClassroomApiError extends DomainError {
  readonly code = "CLASSROOM_API_ERROR";
  readonly statusCode = 502;
  constructor(message = "Falha ao se comunicar com o Google Classroom.") {
    super(message);
  }
}

/** A turma do Classroom referenciada não foi encontrada na conta do professor. */
export class ClassroomCourseNotFoundError extends DomainError {
  readonly code = "CLASSROOM_COURSE_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Turma do Google Classroom não encontrada.");
  }
}
