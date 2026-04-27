import { RoadmapItemId } from "../domain/roadmap-id.js";
import type { RoadmapItemRepository } from "../domain/roadmap-item-repository.js";
import type {
  RoadmapProduct,
  RoadmapStage,
} from "../domain/roadmap-types.js";
import { RoadmapItemNotFoundError } from "../domain/roadmap-errors.js";

interface Input {
  itemId: string;
  title?: string;
  description?: string;
  product?: RoadmapProduct;
  stage?: RoadmapStage;
  staffNote?: string | null;
}

/**
 * Edição staff. Aceita campos parciais — pelo menos um é exigido pelo schema
 * de presentation (Zod refine), aqui não revalidamos isso. Para `staffNote`
 * usa-se `null` explícito para limpar.
 */
export class UpdateRoadmapItemUseCase {
  constructor(private readonly items: RoadmapItemRepository) {}

  async execute(input: Input): Promise<void> {
    const id = RoadmapItemId.of(input.itemId);
    const item = await this.items.findById(id);
    if (!item) throw new RoadmapItemNotFoundError();

    const now = new Date();
    if (input.title !== undefined) item.rename(input.title, now);
    if (input.description !== undefined)
      item.updateDescription(input.description, now);
    if (input.product !== undefined) item.changeProduct(input.product, now);
    if (input.stage !== undefined) item.changeStage(input.stage, now);
    if (input.staffNote !== undefined) item.setStaffNote(input.staffNote, now);

    await this.items.save(item);
  }
}
