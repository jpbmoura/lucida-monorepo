import type { RequestHandler } from "express";
import type { ListInstitutionsUseCase } from "../application/list-institutions.js";
import type { GetInstitutionUseCase } from "../application/get-institution.js";
import type { CreateInstitutionUseCase } from "../application/create-institution.js";
import type { UpdateInstitutionBillingUseCase } from "../application/update-institution-billing.js";
import type {
  ArchiveInstitutionUseCase,
  UnarchiveInstitutionUseCase,
} from "../application/archive-institution.js";
import type { AdjustInstitutionCreditsUseCase } from "../application/adjust-institution-credits.js";
import {
  adjustInstitutionCreditsBody,
  createInstitutionBody,
  institutionParam,
  listInstitutionsQuery,
  updateInstitutionBillingBody,
} from "./kintal-institutions-schemas.js";

interface Deps {
  list: ListInstitutionsUseCase;
  get: GetInstitutionUseCase;
  create: CreateInstitutionUseCase;
  updateBilling: UpdateInstitutionBillingUseCase;
  archive: ArchiveInstitutionUseCase;
  unarchive: UnarchiveInstitutionUseCase;
  adjustCredits: AdjustInstitutionCreditsUseCase;
}

export class KintalInstitutionsController {
  constructor(private readonly deps: Deps) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      const query = listInstitutionsQuery.parse(req.query);
      const data = await this.deps.list.execute({
        q: query.q,
        archived: query.archived,
        limit: query.limit,
        before: query.before,
      });
      res.json({
        institutions: data.map((it) => ({
          ...it,
          createdAt: it.createdAt.toISOString(),
          archivedAt: it.archivedAt?.toISOString() ?? null,
        })),
      });
    } catch (err) {
      next(err);
    }
  };

  getOne: RequestHandler = async (req, res, next) => {
    try {
      const { orgId } = institutionParam.parse(req.params);
      const detail = await this.deps.get.execute(orgId);
      res.json({
        institution: {
          ...detail,
          createdAt: detail.createdAt.toISOString(),
          archivedAt: detail.archivedAt?.toISOString() ?? null,
          members: detail.members.map((m) => ({
            ...m,
            joinedAt: m.joinedAt.toISOString(),
          })),
          walletBreakdown: detail.walletBreakdown.map((w) => ({
            ...w,
            expiresAt: w.expiresAt?.toISOString() ?? null,
            createdAt: w.createdAt.toISOString(),
          })),
          recentLedger: detail.recentLedger.map((e) => ({
            ...e,
            createdAt: e.createdAt.toISOString(),
          })),
          usage: {
            ...detail.usage,
            windowFrom: detail.usage.windowFrom.toISOString(),
            windowTo: detail.usage.windowTo.toISOString(),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  };

  create: RequestHandler = async (req, res, next) => {
    try {
      const body = createInstitutionBody.parse(req.body);
      const result = await this.deps.create.execute(body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  updateBilling: RequestHandler = async (req, res, next) => {
    try {
      const { orgId } = institutionParam.parse(req.params);
      const { billingMode } = updateInstitutionBillingBody.parse(req.body);
      await this.deps.updateBilling.execute({
        organizationId: orgId,
        billingMode,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  archive: RequestHandler = async (req, res, next) => {
    try {
      const { orgId } = institutionParam.parse(req.params);
      await this.deps.archive.execute(orgId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  unarchive: RequestHandler = async (req, res, next) => {
    try {
      const { orgId } = institutionParam.parse(req.params);
      await this.deps.unarchive.execute(orgId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  adjustCredits: RequestHandler = async (req, res, next) => {
    try {
      const { orgId } = institutionParam.parse(req.params);
      const body = adjustInstitutionCreditsBody.parse(req.body);
      const result = await this.deps.adjustCredits.execute({
        organizationId: orgId,
        actorUserId: req.auth!.userId,
        amount: body.amount,
        expiresInDays: body.expiresInDays ?? null,
        note: body.note,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
