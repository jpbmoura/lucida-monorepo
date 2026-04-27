import type { RequestHandler } from "express";
import { DomainError } from "@/shared/errors/domain-error.js";
import type { GetOrganizationPreferencesUseCase } from "../application/get-organization-preferences.js";
import type { UpdateOrganizationPreferencesUseCase } from "../application/update-organization-preferences.js";
import { updateOrganizationPreferencesBody } from "./organization-preferences-schemas.js";

class MissingActiveOrganizationError extends DomainError {
  readonly code = "MISSING_ACTIVE_ORGANIZATION";
  readonly statusCode = 400;
  constructor() {
    super(
      "Nenhuma organização ativa na sessão. Selecione uma antes de gerenciar preferências.",
    );
  }
}

interface Deps {
  getPreferences: GetOrganizationPreferencesUseCase;
  updatePreferences: UpdateOrganizationPreferencesUseCase;
}

export class OrganizationPreferencesController {
  constructor(private readonly deps: Deps) {}

  get: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();
      const prefs = await this.deps.getPreferences.execute({
        organizationId: orgId,
      });
      res.json({
        data: {
          organizationId: prefs.organizationId,
          matriculaScope: prefs.matriculaScope,
          updatedAt: prefs.updatedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const orgId = req.auth!.activeOrganizationId;
      if (!orgId) throw new MissingActiveOrganizationError();
      const body = updateOrganizationPreferencesBody.parse(req.body);
      const prefs = await this.deps.updatePreferences.execute({
        organizationId: orgId,
        matriculaScope: body.matriculaScope,
      });
      res.json({
        data: {
          organizationId: prefs.organizationId,
          matriculaScope: prefs.matriculaScope,
          updatedAt: prefs.updatedAt,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}
