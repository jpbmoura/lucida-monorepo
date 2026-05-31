import type { RequestHandler } from "express";
import type { CreateSlideDeckUseCase } from "../application/create-slide-deck.js";
import type { GetSlideDeckUseCase } from "../application/get-slide-deck.js";
import type { ListSlideDecksUseCase } from "../application/list-slide-decks.js";
import type { UpdateSlideDeckUseCase } from "../application/update-slide-deck.js";
import type { ReorderSlidesUseCase } from "../application/reorder-slides.js";
import type { DeleteSlideDeckUseCase } from "../application/delete-slide-deck.js";
import {
  createSlideDeckBody,
  reorderSlidesBody,
  slideDeckIdParam,
  updateSlideDeckBody,
} from "./slide-deck-schemas.js";

interface Deps {
  createSlideDeck: CreateSlideDeckUseCase;
  getSlideDeck: GetSlideDeckUseCase;
  listSlideDecks: ListSlideDecksUseCase;
  updateSlideDeck: UpdateSlideDeckUseCase;
  reorderSlides: ReorderSlidesUseCase;
  deleteSlideDeck: DeleteSlideDeckUseCase;
}

export class SlideDeckController {
  constructor(private readonly deps: Deps) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      const data = await this.deps.listSlideDecks.execute({
        ownerId: req.auth!.userId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  create: RequestHandler = async (req, res, next) => {
    try {
      const body = createSlideDeckBody.parse(req.body);
      const created = await this.deps.createSlideDeck.execute({
        ownerId: req.auth!.userId,
        organizationId: req.auth!.activeOrganizationId,
        courseId: body.courseId ?? null,
        title: body.title,
        subject: body.subject,
        gradeLevel: body.gradeLevel,
        tone: body.tone,
        theme: body.theme,
        source: body.source,
        slides: body.slides,
        usage: body.usage ?? null,
      });
      res.status(201).json({ data: created });
    } catch (err) {
      next(err);
    }
  };

  get: RequestHandler = async (req, res, next) => {
    try {
      const { id } = slideDeckIdParam.parse(req.params);
      const data = await this.deps.getSlideDeck.execute({
        id,
        ownerId: req.auth!.userId,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { id } = slideDeckIdParam.parse(req.params);
      const body = updateSlideDeckBody.parse(req.body);
      await this.deps.updateSlideDeck.execute({
        id,
        ownerId: req.auth!.userId,
        title: body.title,
        subject: body.subject,
        gradeLevel: body.gradeLevel,
        tone: body.tone,
        theme: body.theme,
        courseId: body.courseId,
        slides: body.slides,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  reorder: RequestHandler = async (req, res, next) => {
    try {
      const { id } = slideDeckIdParam.parse(req.params);
      const body = reorderSlidesBody.parse(req.body);
      await this.deps.reorderSlides.execute({
        id,
        ownerId: req.auth!.userId,
        orderedIds: body.orderedIds,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };

  delete: RequestHandler = async (req, res, next) => {
    try {
      const { id } = slideDeckIdParam.parse(req.params);
      await this.deps.deleteSlideDeck.execute({
        id,
        ownerId: req.auth!.userId,
      });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
