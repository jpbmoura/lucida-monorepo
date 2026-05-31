import type { SlideDeckRepository } from "../domain/slide-deck-repository.js";
import { toSlideDeckDTO, type SlideDeckDTO } from "./slide-deck-dto.js";

interface Input {
  ownerId: string;
}

export class ListSlideDecksUseCase {
  constructor(private readonly decks: SlideDeckRepository) {}

  async execute(input: Input): Promise<SlideDeckDTO[]> {
    const decks = await this.decks.findByOwnerId(input.ownerId);
    return decks.map(toSlideDeckDTO);
  }
}
