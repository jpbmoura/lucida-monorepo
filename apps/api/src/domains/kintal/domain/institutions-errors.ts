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

/**
 * Email pertence a um user que já é membro de outra instituição.
 * Regra de negócio: 1 user = 1 org. Bloqueia tanto o create quanto o
 * add-member.
 */
export class OwnerAlreadyInOrganizationError extends DomainError {
  readonly code = "OWNER_ALREADY_IN_ORGANIZATION";
  readonly statusCode = 409;
  constructor(email: string) {
    super(`O email ${email} já está vinculado a outra instituição.`);
  }
}

/**
 * Um user específico (resolvido por id, não email) já é membro de
 * alguma organização. Usado pelo fluxo "linkar via tela de user".
 */
export class UserAlreadyInOrganizationError extends DomainError {
  readonly code = "USER_ALREADY_IN_ORGANIZATION";
  readonly statusCode = 409;
  constructor() {
    super("Este usuário já está vinculado a uma instituição.");
  }
}

/**
 * Tentativa de criar membership de um user que já é membro DAQUELA org
 * (mesma org). Diferente de `OwnerAlreadyInOrganization` — aqui ele já
 * está dentro da org, não em outra.
 */
export class UserAlreadyMemberError extends DomainError {
  readonly code = "USER_ALREADY_MEMBER";
  readonly statusCode = 409;
  constructor() {
    super("Este usuário já é membro desta instituição.");
  }
}

/** Membership não encontrada quando se tenta remover. */
export class MembershipNotFoundError extends DomainError {
  readonly code = "MEMBERSHIP_NOT_FOUND";
  readonly statusCode = 404;
  constructor() {
    super("Vínculo não encontrado.");
  }
}

/**
 * Não permitir remover o owner via Kintal — pra trocar dono, staff
 * deveria primeiro promover outro user e degradar o owner. Mantemos
 * conservador.
 */
export class CannotRemoveInstitutionOwnerError extends DomainError {
  readonly code = "CANNOT_REMOVE_INSTITUTION_OWNER";
  readonly statusCode = 409;
  constructor() {
    super("Owner não pode ser removido. Arquive a instituição.");
  }
}

/**
 * User a ser linkado/adicionado não existe e o caller não passou dados
 * suficientes pra criar (nome + senha). Lançado por addMember quando o
 * email não corresponde a um user.
 */
export class MemberMissingSignupDataError extends DomainError {
  readonly code = "MEMBER_MISSING_SIGNUP_DATA";
  readonly statusCode = 400;
  constructor() {
    super(
      "Este email não tem cadastro. Informe nome e senha para criar o usuário.",
    );
  }
}

export class InvalidInstitutionInputError extends DomainError {
  readonly code = "INVALID_INSTITUTION_INPUT";
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
  }
}
