import { LessonPlanId } from "../domain/lesson-plan-id.js";
import { LessonPlanNotFoundError } from "../domain/lesson-plan-errors.js";
import type { LessonPlanRepository } from "../domain/lesson-plan-repository.js";
import { toLessonPlanDTO, type LessonPlanDTO } from "./lesson-plan-dto.js";

interface Input {
  planId: string;
  ownerId: string;
}

export class GetLessonPlanUseCase {
  constructor(private readonly plans: LessonPlanRepository) {}

  async execute(input: Input): Promise<LessonPlanDTO> {
    const plan = await this.plans.findById(LessonPlanId.of(input.planId));
    if (!plan || !plan.isOwnedBy(input.ownerId)) {
      throw new LessonPlanNotFoundError();
    }
    return toLessonPlanDTO(plan);
  }
}
