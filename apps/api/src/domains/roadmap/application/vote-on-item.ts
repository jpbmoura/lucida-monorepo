import { RoadmapItemId } from "../domain/roadmap-id.js";
import type { RoadmapItemRepository } from "../domain/roadmap-item-repository.js";
import type { RoadmapVoteRepository } from "../domain/roadmap-vote-repository.js";
import {
  AlreadyVotedError,
  RoadmapItemNotFoundError,
} from "../domain/roadmap-errors.js";

interface Input {
  itemId: string;
  userId: string;
}

export class VoteOnItemUseCase {
  constructor(
    private readonly items: RoadmapItemRepository,
    private readonly votes: RoadmapVoteRepository,
  ) {}

  async execute(input: Input): Promise<void> {
    const id = RoadmapItemId.of(input.itemId);
    const item = await this.items.findById(id);
    if (!item) throw new RoadmapItemNotFoundError();

    // Insere primeiro (unique index é a barreira anti-double-vote). Só
    // incrementa o contador se inseriu — assim contagem nunca diverge
    // por duas chamadas concorrentes do mesmo user.
    const inserted = await this.votes.create(id, input.userId);
    if (!inserted) throw new AlreadyVotedError();

    await this.items.incrementVotes(id, +1);
  }
}
