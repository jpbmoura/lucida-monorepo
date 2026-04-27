import { randomUUID } from "node:crypto";
import type { RoadmapItemId } from "../domain/roadmap-id.js";
import type { RoadmapVoteRepository } from "../domain/roadmap-vote-repository.js";
import { RoadmapVoteModel } from "./roadmap-vote-schema.js";

interface DuplicateKeyLikeError {
  code?: number;
}

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as DuplicateKeyLikeError).code === 11000
  );
}

export class MongooseRoadmapVoteRepository implements RoadmapVoteRepository {
  async create(itemId: RoadmapItemId, userId: string): Promise<boolean> {
    try {
      await RoadmapVoteModel.create({
        _id: randomUUID(),
        itemId: itemId.toString(),
        userId,
      });
      return true;
    } catch (err) {
      if (isDuplicateKey(err)) return false;
      throw err;
    }
  }

  async delete(itemId: RoadmapItemId, userId: string): Promise<boolean> {
    const res = await RoadmapVoteModel.deleteOne({
      itemId: itemId.toString(),
      userId,
    }).exec();
    return res.deletedCount === 1;
  }

  async exists(itemId: RoadmapItemId, userId: string): Promise<boolean> {
    const doc = await RoadmapVoteModel.exists({
      itemId: itemId.toString(),
      userId,
    }).exec();
    return doc !== null;
  }

  async findVotedItemsByUser(
    itemIds: RoadmapItemId[],
    userId: string,
  ): Promise<string[]> {
    if (itemIds.length === 0) return [];
    const docs = await RoadmapVoteModel.find({
      userId,
      itemId: { $in: itemIds.map((i) => i.toString()) },
    })
      .select({ itemId: 1, _id: 0 })
      .lean<{ itemId: string }[]>()
      .exec();
    return docs.map((d) => d.itemId);
  }

  async deleteAllForItem(itemId: RoadmapItemId): Promise<void> {
    await RoadmapVoteModel.deleteMany({ itemId: itemId.toString() }).exec();
  }
}
