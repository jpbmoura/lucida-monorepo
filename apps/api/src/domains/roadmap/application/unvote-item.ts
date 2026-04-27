import { RoadmapItemId } from "../domain/roadmap-id.js";
import type { RoadmapItemRepository } from "../domain/roadmap-item-repository.js";
import type { RoadmapVoteRepository } from "../domain/roadmap-vote-repository.js";
import {
  NotVotedError,
  RoadmapItemNotFoundError,
} from "../domain/roadmap-errors.js";

interface Input {
  itemId: string;
  userId: string;
}

export class UnvoteItemUseCase {
  constructor(
    private readonly items: RoadmapItemRepository,
    private readonly votes: RoadmapVoteRepository,
  ) {}

  async execute(input: Input): Promise<void> {
    const id = RoadmapItemId.of(input.itemId);
    const item = await this.items.findById(id);
    if (!item) throw new RoadmapItemNotFoundError();

    const removed = await this.votes.delete(id, input.userId);
    if (!removed) throw new NotVotedError();

    await this.items.incrementVotes(id, -1);
  }
}
