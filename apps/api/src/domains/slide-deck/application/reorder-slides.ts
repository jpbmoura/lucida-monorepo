import { SlideDeckId } from "../domain/slide-deck-id.js";
import { SlideDeckNotFoundError } from "../domain/slide-deck-errors.js";
import type { SlideDeckRepository } from "../domain/slide-deck-repository.js";

interface Input {
  id: string;
  ownerId: string;
  /** Nova ordem dos slides por id — precisa ser uma permutação exata. */
  orderedIds: string[];
}

export class ReorderSlidesUseCase {
  constructor(private readonly decks: SlideDeckRepository) {}

  async execute(input: Input): Promise<void> {
    const deck = await this.decks.findById(SlideDeckId.of(input.id));
    if (!deck || !deck.isOwnedBy(input.ownerId)) {
      throw new SlideDeckNotFoundError();
    }
    deck.reorderSlides(input.orderedIds);
    await this.decks.save(deck);
  }
}
