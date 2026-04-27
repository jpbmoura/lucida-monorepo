import { randomUUID } from "node:crypto";
import { Card } from "../domain/card.js";
import { CardId } from "../domain/card-id.js";
import { isCardTagId, type CardTagId } from "../domain/card-tag.js";
import type {
  CardRepository,
  ListCardsFilter,
} from "../domain/card-repository.js";
import { CardModel, type CardDoc } from "./card-schema.js";

/** Cards em `done` somem do board após esse intervalo (auto-arquivo). */
const DONE_VISIBLE_DAYS = 30;

export class MongooseCardRepository implements CardRepository {
  nextId(): CardId {
    return CardId.of(randomUUID());
  }

  async save(card: Card): Promise<void> {
    await CardModel.updateOne(
      { _id: card.id.toString() },
      {
        $set: {
          title: card.title,
          description: card.description,
          status: card.status,
          priority: card.priority,
          assigneeId: card.assigneeId,
          tags: card.tags,
          createdById: card.createdById,
          completedAt: card.completedAt,
        },
        $setOnInsert: {
          _id: card.id.toString(),
        },
      },
      { upsert: true },
    );
  }

  async findById(id: CardId): Promise<Card | null> {
    const doc = await CardModel.findById(id.toString())
      .lean<CardDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async listVisible(filter?: ListCardsFilter): Promise<Card[]> {
    const archiveCutoff = new Date(
      Date.now() - DONE_VISIBLE_DAYS * 24 * 60 * 60 * 1000,
    );

    const mongoFilter: Record<string, unknown> = {
      // Mostra tudo que não é done OU done finalizado nos últimos 30 dias.
      // Rejeita done sem completedAt (corrupto/legacy) por segurança.
      $or: [
        { status: { $ne: "done" } },
        { status: "done", completedAt: { $gte: archiveCutoff } },
      ],
    };

    if (filter?.assigneeId === "none") {
      mongoFilter.assigneeId = null;
    } else if (filter?.assigneeId) {
      mongoFilter.assigneeId = filter.assigneeId;
    }
    if (filter?.priority) {
      mongoFilter.priority = filter.priority;
    }
    if (filter?.tagId) {
      mongoFilter.tags = filter.tagId;
    }

    const docs = await CardModel.find(mongoFilter)
      .sort({ updatedAt: -1 })
      .lean<CardDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async delete(id: CardId): Promise<void> {
    await CardModel.deleteOne({ _id: id.toString() });
  }
}

function toEntity(doc: CardDoc): Card {
  // Filtra tags do banco que saíram do catálogo (após edição/remoção do
  // catálogo em deploy posterior). Ledger de auditoria fica no banco
  // mesmo assim — só não exibe.
  const tags = doc.tags.filter(isCardTagId) as CardTagId[];
  return Card.restore({
    id: CardId.of(doc._id),
    title: doc.title,
    description: doc.description,
    status: doc.status,
    priority: doc.priority,
    assigneeId: doc.assigneeId,
    tags,
    createdById: doc.createdById,
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
