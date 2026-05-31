import { SlideDeckId } from "../domain/slide-deck-id.js";
import { SlideDeckNotFoundError } from "../domain/slide-deck-errors.js";
import type { SlideDeckRepository } from "../domain/slide-deck-repository.js";

interface Input {
  id: string;
  ownerId: string;
}

export class DeleteSlideDeckUseCase {
  constructor(private readonly decks: SlideDeckRepository) {}

  async execute(input: Input): Promise<void> {
    const deck = await this.decks.findById(SlideDeckId.of(input.id));
    if (!deck || !deck.isOwnedBy(input.ownerId)) {
      throw new SlideDeckNotFoundError();
    }
    await this.decks.delete(SlideDeckId.of(input.id));
  }
}
