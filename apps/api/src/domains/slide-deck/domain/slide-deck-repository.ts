import type { SlideDeck } from "./slide-deck.js";
import type { SlideDeckId } from "./slide-deck-id.js";

export interface SlideDeckRepository {
  nextId(): SlideDeckId;
  save(deck: SlideDeck): Promise<void>;
  findById(id: SlideDeckId): Promise<SlideDeck | null>;
  /** Decks de um professor. Ordem: createdAt desc. */
  findByOwnerId(ownerId: string): Promise<SlideDeck[]>;
  delete(id: SlideDeckId): Promise<void>;
}
