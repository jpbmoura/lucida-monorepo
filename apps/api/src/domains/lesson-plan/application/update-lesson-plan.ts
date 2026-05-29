import { LessonPlanId } from "../domain/lesson-plan-id.js";
import { LessonPlanNotFoundError } from "../domain/lesson-plan-errors.js";
import type {
  LessonPlanContent,
  LessonPlanIdentification,
  LessonPlanStatus,
} from "../domain/lesson-plan.js";
import type { LessonPlanRepository } from "../domain/lesson-plan-repository.js";

interface Input {
  planId: string;
  ownerId: string;
  identification?: Partial<LessonPlanIdentification>;
  content?: LessonPlanContent;
  status?: LessonPlanStatus;
  /** Handoff: vincula a prova gerada a partir deste plano. */
  generatedExamId?: string;
}

// Auto-save do canvas + finalização. Aceita atualização parcial dos campos.
export class UpdateLessonPlanUseCase {
  constructor(private readonly plans: LessonPlanRepository) {}

  async execute(input: Input): Promise<void> {
    const plan = await this.plans.findById(LessonPlanId.of(input.planId));
    if (!plan || !plan.isOwnedBy(input.ownerId)) {
      throw new LessonPlanNotFoundError();
    }

    const now = new Date();
    if (input.identification !== undefined) {
      plan.updateIdentification(input.identification, now);
    }
    if (input.content !== undefined) {
      plan.replaceContent(input.content, now);
    }
    if (input.status !== undefined) {
      plan.setStatus(input.status, now);
    }
    if (input.generatedExamId !== undefined) {
      plan.linkGeneratedExam(input.generatedExamId, now);
    }

    await this.plans.save(plan);
  }
}
