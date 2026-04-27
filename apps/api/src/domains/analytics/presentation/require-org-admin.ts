import type { RequestHandler } from "express";
import { DomainError } from "@/shared/errors/domain-error.js";
import type { OrganizationMembersRepository } from "../application/ports/organization-members-repository.js";

class NotOrgAdminError extends DomainError {
  readonly code = "NOT_ORG_ADMIN";
  readonly statusCode = 403;
  constructor() {
    super(
      "Acesso ao painel da instituição é restrito a administradores (owner/admin).",
    );
  }
}

class MissingActiveOrganizationError extends DomainError {
  readonly code = "MISSING_ACTIVE_ORGANIZATION";
  readonly statusCode = 400;
  constructor() {
    super(
      "Sessão sem instituição ativa. Selecione uma organização pra continuar.",
    );
  }
}

/**
 * Middleware que exige role `owner` ou `admin` na org ativa do user. Use
 * após `requireAuth`.
 *
 * Distingue dois casos pra o frontend tratar separadamente:
 *  - Sem org ativa na sessão → MISSING_ACTIVE_ORGANIZATION (400). Frontend
 *    mostra NoActiveOrg / fluxo de seleção.
 *  - Tem org ativa mas user é member comum → NOT_ORG_ADMIN (403). Acesso
 *    realmente negado.
 */
export function makeRequireOrgAdmin(
  orgMembersRepo: OrganizationMembersRepository,
): RequestHandler {
  return async (req, _res, next) => {
    try {
      const auth = req.auth;
      if (!auth) throw new NotOrgAdminError();
      const orgId = auth.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();

      const role = await orgMembersRepo.findRole(orgId, auth.userId);
      if (role !== "owner" && role !== "admin") {
        throw new NotOrgAdminError();
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
