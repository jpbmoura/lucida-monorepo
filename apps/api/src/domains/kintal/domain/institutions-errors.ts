import { DomainError } from "@/shared/errors/domain-error.js";

export class InstitutionNotFoundError extends DomainError {
  readonly code = "INSTITUTION_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Instituição não encontrada.");
  }
}

/** Slug já está em uso. Slug é único na collection `organization`. */
export class InstitutionSlugTakenError extends DomainError {
  readonly code = "INSTITUTION_SLUG_TAKEN";
  readonly statusCode = 409;
  constructor(slug: string) {
    super(`Slug "${slug}" já está em uso por outra instituição.`);
  }
}

/** Email já cadastrado em algum user — não pode ser reusado pra criar owner. */
export class InstitutionOwnerEmailTakenError extends DomainError {
  readonly code = "INSTITUTION_OWNER_EMAIL_TAKEN";
  readonly statusCode = 409;
  constructor(email: string) {
    super(`O email ${email} já está cadastrado.`);
  }
}

export class InvalidInstitutionInputError extends DomainError {
  readonly code = "INVALID_INSTITUTION_INPUT";
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
  }
}
