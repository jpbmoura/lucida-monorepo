import { DomainError } from "@/shared/errors/domain-error.js";

export class TicketNotFoundError extends DomainError {
  readonly code = "TICKET_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Ticket não encontrado.");
  }
}

export class TicketReplyEmptyError extends DomainError {
  readonly code = "TICKET_REPLY_EMPTY";
  readonly statusCode = 422;
  constructor() {
    super("Mensagem da resposta não pode ficar vazia.");
  }
}

export class TicketComposeInvalidEmailError extends DomainError {
  readonly code = "TICKET_COMPOSE_INVALID_EMAIL";
  readonly statusCode = 422;
  constructor() {
    super("Email do destinatário inválido.");
  }
}

export class TicketComposeSubjectEmptyError extends DomainError {
  readonly code = "TICKET_COMPOSE_SUBJECT_EMPTY";
  readonly statusCode = 422;
  constructor() {
    super("Assunto do email não pode ficar vazio.");
  }
}

export class TicketComposeBodyEmptyError extends DomainError {
  readonly code = "TICKET_COMPOSE_BODY_EMPTY";
  readonly statusCode = 422;
  constructor() {
    super("Mensagem do email não pode ficar vazia.");
  }
}
