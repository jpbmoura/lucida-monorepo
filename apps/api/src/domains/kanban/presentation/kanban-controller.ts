import type { RequestHandler } from "express";
import type { ListCardsUseCase } from "../application/list-cards.js";
import type { CreateCardUseCase } from "../application/create-card.js";
import type { UpdateCardUseCase } from "../application/update-card.js";
import type { MoveCardUseCase } from "../application/move-card.js";
import type { DeleteCardUseCase } from "../application/delete-card.js";
import {
  cardIdParams,
  createCardBody,
  listCardsQuery,
  moveCardBody,
  updateCardBody,
} from "./kanban-schemas.js";

interface Deps {
  listCards: ListCardsUseCase;
  createCard: CreateCardUseCase;
  updateCard: UpdateCardUseCase;
  moveCard: MoveCardUseCase;
  deleteCard: DeleteCardUseCase;
}

export class KanbanController {
  constructor(private readonly deps: Deps) {}

  list: RequestHandler = async (req, res, next) => {
    try {
      const query = listCardsQuery.parse(req.query);
      const cards = await this.deps.listCards.execute(query);
      res.json({ cards });
    } catch (err) {
      next(err);
    }
  };

  create: RequestHandler = async (req, res, next) => {
    try {
      const body = createCardBody.parse(req.body);
      const createdById = req.auth!.realUserId;
      const card = await this.deps.createCard.execute({
        ...body,
        createdById,
      });
      res.status(201).json({ card });
    } catch (err) {
      next(err);
    }
  };

  update: RequestHandler = async (req, res, next) => {
    try {
      const { cardId } = cardIdParams.parse(req.params);
      const patch = updateCardBody.parse(req.body);
      const card = await this.deps.updateCard.execute({ cardId, patch });
      res.json({ card });
    } catch (err) {
      next(err);
    }
  };

  move: RequestHandler = async (req, res, next) => {
    try {
      const { cardId } = cardIdParams.parse(req.params);
      const { status } = moveCardBody.parse(req.body);
      const card = await this.deps.moveCard.execute({ cardId, status });
      res.json({ card });
    } catch (err) {
      next(err);
    }
  };

  remove: RequestHandler = async (req, res, next) => {
    try {
      const { cardId } = cardIdParams.parse(req.params);
      await this.deps.deleteCard.execute(cardId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}
