import type { CardRepository } from "../domain/card-repository.js";
import { CardId } from "../domain/card-id.js";
import type { CardStatus } from "../domain/card-status.js";
import { CardNotFoundError } from "../domain/kanban-errors.js";
import { toDTO, type CardDTO } from "./list-cards.js";

export interface MoveCardInput {
  cardId: string;
  status: CardStatus;
}

/**
 * Move um card pra outra coluna. Atualiza `completedAt` automaticamente
 * quando entra/sai de `done`. Rota dedicada (em vez de patch genérico)
 * porque drag-and-drop dispara muito — vale dar um endpoint específico.
 */
export class MoveCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  async execute(input: MoveCardInput): Promise<CardDTO> {
    const card = await this.repo.findById(CardId.of(input.cardId));
    if (!card) throw new CardNotFoundError();
    card.moveTo(input.status);
    await this.repo.save(card);
    return toDTO(card);
  }
}
