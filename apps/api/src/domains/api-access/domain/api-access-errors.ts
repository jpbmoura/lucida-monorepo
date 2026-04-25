import { DomainError } from "@/shared/errors/domain-error.js";

export class ApiKeyNotFoundError extends DomainError {
  readonly code = "API_KEY_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Chave de API não encontrada.");
  }
}

export class ApiKeyAlreadyRevokedError extends DomainError {
  readonly code = "API_KEY_ALREADY_REVOKED";
  readonly statusCode = 409;
  constructor() {
    super("Esta chave já foi revogada.");
  }
}

/**
 * Escopo inválido no payload de criação. Mensagem lista os escopos
 * recusados pra o caller conseguir corrigir sem precisar adivinhar.
 */
export class InvalidApiKeyScopesError extends DomainError {
  readonly code = "INVALID_API_KEY_SCOPES";
  readonly statusCode = 400;
  constructor(invalidScopes: string[]) {
    super(
      invalidScopes.length === 1
        ? `Escopo inválido: "${invalidScopes[0]}".`
        : `Escopos inválidos: ${invalidScopes.map((s) => `"${s}"`).join(", ")}.`,
    );
  }
}

export class WebhookEndpointNotFoundError extends DomainError {
  readonly code = "WEBHOOK_ENDPOINT_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Endpoint de webhook não encontrado.");
  }
}

export class InvalidWebhookEventsError extends DomainError {
  readonly code = "INVALID_WEBHOOK_EVENTS";
  readonly statusCode = 400;
  constructor(invalidEvents: string[]) {
    super(
      invalidEvents.length === 1
        ? `Evento inválido: "${invalidEvents[0]}".`
        : `Eventos inválidos: ${invalidEvents.map((e) => `"${e}"`).join(", ")}.`,
    );
  }
}

/**
 * URL de webhook rejeitada. Em `live`, só HTTPS é aceito (evita vazar
 * dados do aluno em trânsito). Em `test`, `http://localhost:*` também
 * passa, pra facilitar dev local do parceiro.
 */
export class InvalidWebhookUrlError extends DomainError {
  readonly code = "INVALID_WEBHOOK_URL";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}
