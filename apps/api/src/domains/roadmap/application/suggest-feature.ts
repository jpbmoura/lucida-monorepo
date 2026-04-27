import { RoadmapItem } from "../domain/roadmap-item.js";
import type { RoadmapItemRepository } from "../domain/roadmap-item-repository.js";
import type { RoadmapProduct } from "../domain/roadmap-types.js";

interface Input {
  title: string;
  description?: string;
  product: RoadmapProduct;
  userId: string;
}

interface Output {
  id: string;
}

/**
 * Cria uma sugestão da comunidade. Hoje sai como `auto_approved` (configuração
 * de produto). Quando virar fila de moderação, basta trocar pra `pending`
 * aqui — o resto do sistema já filtra por moderationStatus.
 */
export class SuggestFeatureUseCase {
  constructor(private readonly items: RoadmapItemRepository) {}

  async execute(input: Input): Promise<Output> {
    const item = RoadmapItem.create({
      id: this.items.nextId(),
      title: input.title,
      description: input.description,
      product: input.product,
      stage: "suggested",
      source: "community",
      moderationStatus: "auto_approved",
      createdBy: input.userId,
    });
    await this.items.save(item);
    return { id: item.id.toString() };
  }
}
