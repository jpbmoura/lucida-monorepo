import type { LessonPlanRepository } from "../domain/lesson-plan-repository.js";
import type { LessonPlanSegment, LessonPlanStatus } from "../domain/lesson-plan.js";
import { ClassId } from "@/domains/class/domain/class-id.js";
import { ClassNotFoundError } from "@/domains/class/domain/class-errors.js";
import type { ClassRepository } from "@/domains/class/domain/class-repository.js";

interface Input {
  classId: string;
  ownerId: string;
  includeArchived?: boolean;
}

export interface ListLessonPlansItem {
  id: string;
  segment: LessonPlanSegment;
  status: LessonPlanStatus;
  title: string;
  subject: string;
  level: string;
  durationMinutes: number;
  generatedExamId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ListLessonPlansByClassUseCase {
  constructor(
    private readonly plans: LessonPlanRepository,
    private readonly classes: ClassRepository,
  ) {}

  async execute(input: Input): Promise<ListLessonPlansItem[]> {
    const cls = await this.classes.findById(ClassId.of(input.classId));
    if (!cls || !cls.isOwnedBy(input.ownerId)) {
      throw new ClassNotFoundError();
    }
    const plans = await this.plans.findByClassId(cls.id.toString(), {
      includeArchived: input.includeArchived,
    });
    return plans.map((p) => ({
      id: p.id.toString(),
      segment: p.segment,
      status: p.status,
      title: p.identification.title,
      subject: p.identification.subject,
      level: p.identification.level,
      durationMinutes: p.identification.durationMinutes,
      generatedExamId: p.generatedExamId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }
}
