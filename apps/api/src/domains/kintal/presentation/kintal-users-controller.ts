import type { RequestHandler } from "express";
import type { ListKintalUsersUseCase } from "../application/list-kintal-users.js";
import type { GetKintalUserUseCase } from "../application/get-kintal-user.js";
import type { UpdateKintalUserUseCase } from "../application/update-kintal-user.js";
import type { AdjustUserCreditsUseCase } from "../application/adjust-user-credits.js";
import {
  adjustCreditsBody,
  listKintalUsersQuery,
  updateKintalUserBody,
  userIdParams,
} from "./kintal-users-schemas.js";

interface Deps {
  listUsers: ListKintalUsersUseCase;
  getUser: GetKintalUserUseCase;
  updateUser: UpdateKintalUserUseCase;
  adjustCredits: AdjustUserCreditsUseCase;
}

export class KintalUsersController {
  constructor(private readonly deps: Deps) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      const query = listKintalUsersQuery.parse(req.query);
      const result = await this.deps.listUsers.execute({
        q: query.q,
        subscription: query.subscription,
        role: query.role,
        createdWithin: query.createdWithin,
        page: query.page,
        pageSize: query.pageSize ?? query.limit,
      });
      res.json({
        users: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
      });
    } catch (err) {
      next(err);
    }
  };

  getOne: RequestHandler = async (req, res, next) => {
    try {
      const { userId } = userIdParams.parse(req.params);
      const user = await this.deps.getUser.execute({ userId });
      res.json({ user });
    } catch (err) {
      next(err);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { userId } = userIdParams.parse(req.params);
      const patch = updateKintalUserBody.parse(req.body);
      await this.deps.updateUser.execute({ userId, patch });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  adjustCredits: RequestHandler = async (req, res, next) => {
    try {
      const { userId } = userIdParams.parse(req.params);
      const { amount, note } = adjustCreditsBody.parse(req.body);
      const actorUserId = req.auth!.realUserId;
      const result = await this.deps.adjustCredits.execute({
        userId,
        actorUserId,
        amount,
        note,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
