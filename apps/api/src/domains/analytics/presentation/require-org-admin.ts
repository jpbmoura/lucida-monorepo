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

/**
 * Middleware que exige role `owner` ou `admin` na org ativa do user. Use
 * após `requireAuth`. Member comum recebe 403 NOT_ORG_ADMIN.
 *
 * Se a sessão não tem org ativa, devolvemos 403 também — /analytics só
 * existe no contexto de uma org; se caiu aqui sem activeOrganizationId é
 * URL direta não autorizada.
 */
export function makeRequireOrgAdmin(
  orgMembersRepo: OrganizationMembersRepository,
): RequestHandler {
  return async (req, _res, next) => {
    try {
      const auth = req.auth;
      if (!auth) throw new NotOrgAdminError();
      const orgId = auth.activeOrganizationId;
      if (!orgId) throw new NotOrgAdminError();

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
