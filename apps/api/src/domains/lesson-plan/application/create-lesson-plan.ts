import {
  LessonPlan,
  type LessonPlanContent,
  type LessonPlanIdentification,
  type LessonPlanSegment,
  type LessonPlanStatus,
  type LessonPlanUsage,
} from "../domain/lesson-plan.js";
import type { LessonPlanRepository } from "../domain/lesson-plan-repository.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ClassNotFoundError } from "@/domains/class/domain/class-errors.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";

export interface CreateLessonPlanInput {
  classId: string;
  ownerId: string;
  segment: LessonPlanSegment;
  status?: LessonPlanStatus;
  identification: LessonPlanIdentification;
  content: LessonPlanContent;
  sourceMaterialIds?: string[];
  usage?: LessonPlanUsage | null;
}

export interface CreateLessonPlanOutput {
  id: string;
}

export class CreateLessonPlanUseCase {
  constructor(
    private readonly plans: LessonPlanRepository,
    private readonly classes: ClassRepository,
  ) {}

  async execute(input: CreateLessonPlanInput): Promise<CreateLessonPlanOutput> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }

    const plan = LessonPlan.create({
      id: this.plans.nextId(),
      classId: cls.id.toString(),
      courseId: cls.courseId,
      ownerId: input.ownerId,
      organizationId: cls.organizationId,
      segment: input.segment,
      status: input.status ?? "READY",
      identification: input.identification,
      content: input.content,
      sourceMaterialIds: input.sourceMaterialIds ?? [],
      usage: input.usage ?? null,
    });

    await this.plans.save(plan);
    return { id: plan.id.toString() };
  }
}
