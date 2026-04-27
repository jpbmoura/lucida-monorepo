import { RoadmapItemId } from "../domain/roadmap-id.js";
import type { RoadmapItemRepository } from "../domain/roadmap-item-repository.js";
import type { RoadmapVoteRepository } from "../domain/roadmap-vote-repository.js";
import { RoadmapItemNotFoundError } from "../domain/roadmap-errors.js";

interface Input {
  itemId: string;
}

export class DeleteRoadmapItemUseCase {
  constructor(
    private readonly items: RoadmapItemRepository,
    private readonly votes: RoadmapVoteRepository,
  ) {}

  async execute(input: Input): Promise<void> {
    const id = RoadmapItemId.of(input.itemId);
    const item = await this.items.findById(id);
    if (!item) throw new RoadmapItemNotFoundError();

    // Apaga votos antes do item — se o item ficar sem votos órfãos não tem
    // unique pra honrar; se a deleção do item falhar, retentar é safe.
    await this.votes.deleteAllForItem(id);
    await this.items.delete(id);
  }
}
