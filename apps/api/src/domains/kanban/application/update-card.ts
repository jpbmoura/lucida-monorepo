import type { CardRepository } from "../domain/card-repository.js";
import { CardId } from "../domain/card-id.js";
import type { CardPriority } from "../domain/card-priority.js";
import { CardNotFoundError } from "../domain/kanban-errors.js";
import { toDTO, type CardDTO } from "./list-cards.js";

export interface UpdateCardInput {
  cardId: string;
  patch: {
    title?: string;
    description?: string;
    priority?: CardPriority;
    assigneeId?: string | null;
    tags?: string[];
  };
}

export class UpdateCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  async execute(input: UpdateCardInput): Promise<CardDTO> {
    const card = await this.repo.findById(CardId.of(input.cardId));
    if (!card) throw new CardNotFoundError();
    card.patch(input.patch);
    await this.repo.save(card);
    return toDTO(card);
  }
}
