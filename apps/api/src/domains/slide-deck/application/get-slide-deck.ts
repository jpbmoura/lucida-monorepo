import { SlideDeckId } from "../domain/slide-deck-id.js";
import { SlideDeckNotFoundError } from "../domain/slide-deck-errors.js";
import type { SlideDeckRepository } from "../domain/slide-deck-repository.js";
import { toSlideDeckDTO, type SlideDeckDTO } from "./slide-deck-dto.js";

interface Input {
  id: string;
  ownerId: string;
}

export class GetSlideDeckUseCase {
  constructor(private readonly decks: SlideDeckRepository) {}

  async execute(input: Input): Promise<SlideDeckDTO> {
    const deck = await this.decks.findById(SlideDeckId.of(input.id));
    if (!deck || !deck.isOwnedBy(input.ownerId)) {
      throw new SlideDeckNotFoundError();
    }
    return toSlideDeckDTO(deck);
  }
}
