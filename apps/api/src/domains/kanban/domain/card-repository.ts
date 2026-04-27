import type { Card } from "./card.js";
import type { CardId } from "./card-id.js";

export interface ListCardsFilter {
  /** Filtra por staff atribuído. `"none"` = sem responsável. */
  assigneeId?: string | "none";
  priority?: string;
  tagId?: string;
}

export interface CardRepository {
  nextId(): CardId;
  save(card: Card): Promise<void>;
  findById(id: CardId): Promise<Card | null>;
  /**
   * Lista cards visíveis no board. Auto-arquiva: cards em `done` há mais
   * de 30 dias não retornam aqui. Continuam queryáveis via findById.
   */
  listVisible(filter?: ListCardsFilter): Promise<Card[]>;
  delete(id: CardId): Promise<void>;
}
