import type { RequestHandler } from "express";
import type { CreateRoadmapItemUseCase } from "../application/create-roadmap-item.js";
import type { UpdateRoadmapItemUseCase } from "../application/update-roadmap-item.js";
import type { DeleteRoadmapItemUseCase } from "../application/delete-roadmap-item.js";
import {
  createRoadmapItemBody,
  itemIdParam,
  updateRoadmapItemBody,
} from "./roadmap-schemas.js";
import type {
  RoadmapProduct,
  RoadmapStage,
} from "../domain/roadmap-types.js";

interface Deps {
  createRoadmapItem: CreateRoadmapItemUseCase;
  updateRoadmapItem: UpdateRoadmapItemUseCase;
  deleteRoadmapItem: DeleteRoadmapItemUseCase;
}

export class RoadmapStaffController {
  constructor(private readonly deps: Deps) {}

  create: RequestHandler = async (req, res, next) => {
    try {
      const body = createRoadmapItemBody.parse(req.body);
      const result = await this.deps.createRoadmapItem.execute({
        title: body.title,
        description: body.description,
        product: body.product,
        // Cast safe — Zod já validou que é um stage criável.
        stage: body.stage as RoadmapStage,
        staffNote: body.staffNote ?? null,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = itemIdParam.parse(req.params);
      const body = updateRoadmapItemBody.parse(req.body);
      await this.deps.updateRoadmapItem.execute({
        itemId: id,
        title: body.title,
        description: body.description,
        product: body.product as RoadmapProduct | undefined,
        stage: body.stage as RoadmapStage | undefined,
        staffNote: body.staffNote ?? undefined,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  delete: RequestHandler = async (req, res, next) => {
    try {
      const { id } = itemIdParam.parse(req.params);
      await this.deps.deleteRoadmapItem.execute({ itemId: id });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
