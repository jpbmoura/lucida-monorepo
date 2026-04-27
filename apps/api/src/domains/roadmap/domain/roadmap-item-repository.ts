import type { RoadmapItem } from "./roadmap-item.js";
import type { RoadmapItemId } from "./roadmap-id.js";
import type { RoadmapProduct } from "./roadmap-types.js";

export interface RoadmapItemRepository {
  nextId(): RoadmapItemId;

  /**
   * Lista todos os itens visíveis publicamente — ordenados por estágio
   * (a ordem é decidida em camada acima) e, dentro do estágio `suggested`,
   * por número de votos. O filtro de moderação é aplicado aqui: hoje
   * retorna `auto_approved` + `approved` (config #1). `pending` e
   * `rejected` ficam fora.
   */
  listVisible(filter?: { product?: RoadmapProduct }): Promise<RoadmapItem[]>;

  findById(id: RoadmapItemId): Promise<RoadmapItem | null>;

  save(item: RoadmapItem): Promise<void>;

  delete(id: RoadmapItemId): Promise<void>;

  /**
   * Atualiza o contador denormalizado de votos. Não chama save() — é uma
   * operação atômica do repositório de items pra evitar ler/escrever toda
   * a entidade só pra mexer no contador.
   */
  incrementVotes(id: RoadmapItemId, delta: number): Promise<void>;
}
