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
