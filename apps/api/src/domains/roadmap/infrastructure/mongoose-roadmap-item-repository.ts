import { randomUUID } from "node:crypto";
import { RoadmapItem } from "../domain/roadmap-item.js";
import { RoadmapItemId } from "../domain/roadmap-id.js";
import type { RoadmapItemRepository } from "../domain/roadmap-item-repository.js";
import type { RoadmapProduct } from "../domain/roadmap-types.js";
import { RoadmapItemModel, type RoadmapItemDoc } from "./roadmap-item-schema.js";

// Estados de moderação que aparecem publicamente. Hoje cobre o modo
// auto-publicação (default `auto_approved`); quando virar fila, `pending`
// fica de fora e `approved` entra. A lista é central pra não esquecer um
// estado se o conjunto crescer.
const PUBLIC_MODERATION_STATUSES = ["auto_approved", "approved"] as const;

export class MongooseRoadmapItemRepository implements RoadmapItemRepository {
  nextId(): RoadmapItemId {
    return RoadmapItemId.of(randomUUID());
  }

  async listVisible(filter?: {
    product?: RoadmapProduct;
  }): Promise<RoadmapItem[]> {
    const query: Record<string, unknown> = {
      moderationStatus: { $in: PUBLIC_MODERATION_STATUSES },
    };
    if (filter?.product) query.product = filter.product;

    const docs = await RoadmapItemModel.find(query)
      .sort({ votes: -1, createdAt: -1 })
      .lean<RoadmapItemDoc[]>()
      .exec();
    return docs.map(toEntity);
  }

  async findById(id: RoadmapItemId): Promise<RoadmapItem | null> {
    const doc = await RoadmapItemModel.findById(id.toString())
      .lean<RoadmapItemDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async save(item: RoadmapItem): Promise<void> {
    await RoadmapItemModel.updateOne(
      { _id: item.id.toString() },
      {
        $set: {
          title: item.title,
          description: item.description,
          product: item.product,
          stage: item.stage,
          source: item.source,
          moderationStatus: item.moderationStatus,
          createdBy: item.createdBy,
          staffNote: item.staffNote,
        },
        $setOnInsert: {
          _id: item.id.toString(),
          votes: item.votes,
          createdAt: item.createdAt,
        },
      },
      { upsert: true },
    );
  }

  async delete(id: RoadmapItemId): Promise<void> {
    await RoadmapItemModel.deleteOne({ _id: id.toString() }).exec();
  }

  async incrementVotes(id: RoadmapItemId, delta: number): Promise<void> {
    // Bloqueia o contador de cair abaixo de zero — defesa contra double-unvote
    // mesmo se a unique do voto falhar de algum jeito.
    if (delta < 0) {
      await RoadmapItemModel.updateOne(
        { _id: id.toString(), votes: { $gt: 0 } },
        { $inc: { votes: delta } },
      ).exec();
      return;
    }
    await RoadmapItemModel.updateOne(
      { _id: id.toString() },
      { $inc: { votes: delta } },
    ).exec();
  }
}

function toEntity(doc: RoadmapItemDoc): RoadmapItem {
  return RoadmapItem.restore({
    id: RoadmapItemId.of(doc._id),
    title: doc.title,
    description: doc.description ?? "",
    product: doc.product,
    stage: doc.stage,
    source: doc.source,
    votes: doc.votes ?? 0,
    moderationStatus: doc.moderationStatus,
    createdBy: doc.createdBy ?? null,
    staffNote: doc.staffNote ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
