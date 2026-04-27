import { Card } from "../domain/card.js";
import type { CardRepository } from "../domain/card-repository.js";
import type { CardPriority } from "../domain/card-priority.js";
import type { CardStatus } from "../domain/card-status.js";
import { toDTO, type CardDTO } from "./list-cards.js";

export interface CreateCardInput {
  title: string;
  description?: string;
  status?: CardStatus;
  priority?: CardPriority;
  assigneeId?: string | null;
  tags?: string[];
  createdById: string;
}

export class CreateCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  async execute(input: CreateCardInput): Promise<CardDTO> {
    const card = Card.create({
      id: this.repo.nextId(),
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      tags: input.tags,
      createdById: input.createdById,
    });
    await this.repo.save(card);
    return toDTO(card);
  }
}
