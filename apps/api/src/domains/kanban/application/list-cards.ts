import type {
  CardRepository,
  ListCardsFilter,
} from "../domain/card-repository.js";
import type { Card } from "../domain/card.js";

export interface CardDTO {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  tags: string[];
  createdById: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ListCardsUseCase {
  constructor(private readonly repo: CardRepository) {}

  async execute(filter?: ListCardsFilter): Promise<CardDTO[]> {
    const cards = await this.repo.listVisible(filter);
    return cards.map(toDTO);
  }
}

export function toDTO(card: Card): CardDTO {
  return {
    id: card.id.toString(),
    title: card.title,
    description: card.description,
    status: card.status,
    priority: card.priority,
    assigneeId: card.assigneeId,
    tags: card.tags,
    createdById: card.createdById,
    completedAt: card.completedAt?.toISOString() ?? null,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}
