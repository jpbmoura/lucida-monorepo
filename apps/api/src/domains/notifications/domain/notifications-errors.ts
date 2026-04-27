import { DomainError } from "@/shared/errors/domain-error.js";

export class NotificationNotFoundError extends DomainError {
  readonly code = "NOTIFICATION_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Notificação não encontrada.");
  }
}

export class CampaignNotFoundError extends DomainError {
  readonly code = "CAMPAIGN_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Campanha não encontrada.");
  }
}

export class CampaignAccessDeniedError extends DomainError {
  readonly code = "CAMPAIGN_ACCESS_DENIED";
  readonly statusCode = 403;
  constructor() {
    super("Você não pode gerenciar essa campanha.");
  }
}

export class EmptyAudienceError extends DomainError {
  readonly code = "EMPTY_AUDIENCE";
  readonly statusCode = 400;
  constructor() {
    super("A audiência selecionada não tem nenhum destinatário.");
  }
}

export class InvalidAudienceError extends DomainError {
  readonly code = "INVALID_AUDIENCE";
  readonly statusCode = 400;
  constructor(reason: string) {
    super(reason);
  }
}
