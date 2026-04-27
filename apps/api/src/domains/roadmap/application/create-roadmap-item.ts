import { RoadmapItem } from "../domain/roadmap-item.js";
import type { RoadmapItemRepository } from "../domain/roadmap-item-repository.js";
import {
  STAFF_CREATABLE_STAGES,
  type RoadmapProduct,
  type RoadmapStage,
} from "../domain/roadmap-types.js";
import { InvalidStageTransitionError } from "../domain/roadmap-errors.js";

interface Input {
  title: string;
  description?: string;
  product: RoadmapProduct;
  stage: RoadmapStage;
  staffNote?: string | null;
}

interface Output {
  id: string;
}

/**
 * Staff cria um item direto (não-comunitário). Só aceita estágios curados
 * (não pode criar como `suggested` ou `declined` — esses são transições, não
 * pontos de partida). Source fica gravado como `staff` permanentemente.
 */
export class CreateRoadmapItemUseCase {
  constructor(private readonly items: RoadmapItemRepository) {}

  async execute(input: Input): Promise<Output> {
    if (!STAFF_CREATABLE_STAGES.includes(input.stage)) {
      throw new InvalidStageTransitionError(
        `Staff só pode criar items nos estágios: ${STAFF_CREATABLE_STAGES.join(", ")}.`,
      );
    }

    const item = RoadmapItem.create({
      id: this.items.nextId(),
      title: input.title,
      description: input.description,
      product: input.product,
      stage: input.stage,
      source: "staff",
      moderationStatus: "auto_approved",
      createdBy: null,
      staffNote: input.staffNote ?? null,
    });
    await this.items.save(item);
    return { id: item.id.toString() };
  }
}
