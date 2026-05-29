import { LessonPlan } from "../domain/lesson-plan.js";
import { LessonPlanId } from "../domain/lesson-plan-id.js";
import { LessonPlanNotFoundError } from "../domain/lesson-plan-errors.js";
import type { LessonPlanRepository } from "../domain/lesson-plan-repository.js";

interface Input {
  planId: string;
  ownerId: string;
}

export interface DuplicateLessonPlanOutput {
  id: string;
}

export class DuplicateLessonPlanUseCase {
  constructor(private readonly plans: LessonPlanRepository) {}

  async execute(input: Input): Promise<DuplicateLessonPlanOutput> {
    const source = await this.plans.findById(LessonPlanId.of(input.planId));
    if (!source || !source.isOwnedBy(input.ownerId)) {
      throw new LessonPlanNotFoundError();
    }

    const id = source.identification;
    const copy = LessonPlan.create({
      id: this.plans.nextId(),
      classId: source.classId,
      courseId: source.courseId,
      ownerId: source.ownerId,
      organizationId: source.organizationId,
      segment: source.segment,
      status: "DRAFT",
      identification: { ...id, title: `${id.title} (cópia)` },
      content: source.content,
      sourceMaterialIds: source.sourceMaterialIds,
      // Cópia não herda handoff nem usage do original.
      generatedExamId: null,
      generatedMaterialId: null,
      usage: null,
    });

    await this.plans.save(copy);
    return { id: copy.id.toString() };
  }
}
