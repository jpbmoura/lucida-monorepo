import type { RequestHandler } from "express";
import type { ListStaffUseCase } from "../application/list-staff.js";
import type { PromoteToStaffUseCase } from "../application/promote-to-staff.js";
import type { RevokeStaffUseCase } from "../application/revoke-staff.js";
import {
  promoteStaffBody,
  revokeStaffParams,
} from "./kintal-staff-schemas.js";

interface Deps {
  listStaff: ListStaffUseCase;
  promoteToStaff: PromoteToStaffUseCase;
  revokeStaff: RevokeStaffUseCase;
}

export class KintalStaffController {
  constructor(private readonly deps: Deps) {}

  list: RequestHandler = async (_req, res, next) => {
    try {
      const staff = await this.deps.listStaff.execute();
      res.json({ staff });
    } catch (err) {
      next(err);
    }
  };

  promote: RequestHandler = async (req, res, next) => {
    try {
      const { email } = promoteStaffBody.parse(req.body);
      const member = await this.deps.promoteToStaff.execute({ email });
      res.status(201).json({ member });
    } catch (err) {
      next(err);
    }
  };

  revoke: RequestHandler = async (req, res, next) => {
    try {
      const { userId } = revokeStaffParams.parse(req.params);
      const requesterUserId = req.auth!.realUserId;
      await this.deps.revokeStaff.execute({
        targetUserId: userId,
        requesterUserId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
