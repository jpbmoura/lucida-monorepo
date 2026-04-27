import type { RoadmapItemId } from "./roadmap-id.js";

export interface RoadmapVoteRepository {
  /**
   * Cria o voto. Retorna `true` se inseriu agora, `false` se já existia
   * (idempotente — quem chama decide se isso é erro). Usa unique index
   * (itemId, userId) por baixo.
   */
  create(itemId: RoadmapItemId, userId: string): Promise<boolean>;

  /**
   * Remove o voto. Retorna `true` se algo foi deletado, `false` se não
   * havia voto (também idempotente).
   */
  delete(itemId: RoadmapItemId, userId: string): Promise<boolean>;

  exists(itemId: RoadmapItemId, userId: string): Promise<boolean>;

  /**
   * Para um conjunto de items, retorna a lista dos itemIds nos quais o
   * usuário votou. Usado pra marcar os cards do roadmap pra um user
   * logado em uma única query.
   */
  findVotedItemsByUser(
    itemIds: RoadmapItemId[],
    userId: string,
  ): Promise<string[]>;

  deleteAllForItem(itemId: RoadmapItemId): Promise<void>;
}
