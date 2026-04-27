import type { CardRepository } from "../domain/card-repository.js";
import { CardId } from "../domain/card-id.js";
import { CardNotFoundError } from "../domain/kanban-errors.js";

export class DeleteCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  async execute(cardId: string): Promise<void> {
    const id = CardId.of(cardId);
    const existing = await this.repo.findById(id);
    if (!existing) throw new CardNotFoundError();
    await this.repo.delete(id);
  }
}
