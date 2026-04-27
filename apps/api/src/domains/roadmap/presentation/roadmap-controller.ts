import type { RequestHandler } from "express";
import type { ListRoadmapUseCase } from "../application/list-roadmap.js";
import type { SuggestFeatureUseCase } from "../application/suggest-feature.js";
import type { VoteOnItemUseCase } from "../application/vote-on-item.js";
import type { UnvoteItemUseCase } from "../application/unvote-item.js";
import {
  itemIdParam,
  listRoadmapQuery,
  suggestFeatureBody,
} from "./roadmap-schemas.js";

interface Deps {
  listRoadmap: ListRoadmapUseCase;
  suggestFeature: SuggestFeatureUseCase;
  voteOnItem: VoteOnItemUseCase;
  unvoteItem: UnvoteItemUseCase;
}

export class RoadmapController {
  constructor(private readonly deps: Deps) {}

  // GET público — funciona com ou sem auth. Quando o request entra com
  // sessão (montado pelo router de auth opcional), incluímos o userId pra
  // marcar o que ele já votou e o role pra liberar createdBy.
  list: RequestHandler = async (req, res, next) => {
    try {
      const query = listRoadmapQuery.parse(req.query);
      const result = await this.deps.listRoadmap.execute({
        product: query.product,
        viewerUserId: req.auth?.realUserId,
        viewerRole: req.auth?.realUserRole ?? null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  suggest: RequestHandler = async (req, res, next) => {
    try {
      const body = suggestFeatureBody.parse(req.body);
      const result = await this.deps.suggestFeature.execute({
        title: body.title,
        description: body.description,
        product: body.product,
        userId: req.auth!.realUserId,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  vote: RequestHandler = async (req, res, next) => {
    try {
      const { id } = itemIdParam.parse(req.params);
      await this.deps.voteOnItem.execute({
        itemId: id,
        userId: req.auth!.realUserId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  unvote: RequestHandler = async (req, res, next) => {
    try {
      const { id } = itemIdParam.parse(req.params);
      await this.deps.unvoteItem.execute({
        itemId: id,
        userId: req.auth!.realUserId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
