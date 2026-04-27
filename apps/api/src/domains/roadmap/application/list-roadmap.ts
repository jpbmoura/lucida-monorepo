import type { RoadmapItem } from "../domain/roadmap-item.js";
import type { RoadmapItemRepository } from "../domain/roadmap-item-repository.js";
import type { RoadmapVoteRepository } from "../domain/roadmap-vote-repository.js";
import type { RoadmapProduct } from "../domain/roadmap-types.js";
import type { RoadmapItemDto } from "./roadmap-dto.js";

interface Input {
  product?: RoadmapProduct;
  /** Quando setado, marca itens já votados pelo user. */
  viewerUserId?: string;
  /** Controla a privacidade do `createdBy`: hoje, só staff vê. */
  viewerRole?: string | null;
}

interface Output {
  items: RoadmapItemDto[];
}

export class ListRoadmapUseCase {
  constructor(
    private readonly items: RoadmapItemRepository,
    private readonly votes: RoadmapVoteRepository,
  ) {}

  async execute(input: Input = {}): Promise<Output> {
    const items = await this.items.listVisible({ product: input.product });

    const votedSet = await this.loadVotedSet(items, input.viewerUserId);
    const isStaff = input.viewerRole === "staff";

    return {
      items: items.map((item) => toDto(item, votedSet.has(item.id.toString()), isStaff)),
    };
  }

  private async loadVotedSet(
    items: RoadmapItem[],
    viewerUserId: string | undefined,
  ): Promise<Set<string>> {
    if (!viewerUserId || items.length === 0) return new Set();
    const voted = await this.votes.findVotedItemsByUser(
      items.map((i) => i.id),
      viewerUserId,
    );
    return new Set(voted);
  }
}

function toDto(
  item: RoadmapItem,
  viewerHasVoted: boolean,
  isStaff: boolean,
): RoadmapItemDto {
  return {
    id: item.id.toString(),
    title: item.title,
    description: item.description,
    product: item.product,
    stage: item.stage,
    source: item.source,
    votes: item.votes,
    moderationStatus: item.moderationStatus,
    staffNote: item.staffNote,
    // Privacidade: público vê origem (community/staff) mas não a identidade
    // do autor. Staff vê o userId pra rastrear quem sugeriu.
    createdBy: isStaff ? item.createdBy : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    viewerHasVoted,
  };
}
