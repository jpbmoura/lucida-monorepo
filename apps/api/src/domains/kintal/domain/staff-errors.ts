import { DomainError } from "@/shared/errors/domain-error.js";

export class UserNotFoundError extends DomainError {
  readonly code = "USER_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super(
      "Nenhuma conta encontrada com esse e-mail. A pessoa precisa criar uma conta na Lucida antes de receber acesso.",
    );
  }
}

export class AlreadyStaffError extends DomainError {
  readonly code = "ALREADY_STAFF";
  readonly statusCode = 409;
  constructor() {
    super("Esse usuário já tem acesso ao Kintal.");
  }
}

export class CannotRevokeSelfError extends DomainError {
  readonly code = "CANNOT_REVOKE_SELF";
  readonly statusCode = 400;
  constructor() {
    super("Você não pode remover seu próprio acesso.");
  }
}
