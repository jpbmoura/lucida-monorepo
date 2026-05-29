import { LessonPlanId } from "../domain/lesson-plan-id.js";
import { LessonPlanNotFoundError } from "../domain/lesson-plan-errors.js";
import type { LessonPlanRepository } from "../domain/lesson-plan-repository.js";

interface Input {
  planId: string;
  ownerId: string;
  /** true = arquivar; false = restaurar (volta pra READY). */
  archived: boolean;
}

export class ArchiveLessonPlanUseCase {
  constructor(private readonly plans: LessonPlanRepository) {}

  async execute(input: Input): Promise<void> {
    const plan = await this.plans.findById(LessonPlanId.of(input.planId));
    if (!plan || !plan.isOwnedBy(input.ownerId)) {
      throw new LessonPlanNotFoundError();
    }
    plan.setStatus(input.archived ? "ARCHIVED" : "READY");
    await this.plans.save(plan);
  }
}
