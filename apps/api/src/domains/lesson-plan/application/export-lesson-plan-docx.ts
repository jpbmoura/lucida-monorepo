import { LessonPlanId } from "../domain/lesson-plan-id.js";
import { LessonPlanNotFoundError } from "../domain/lesson-plan-errors.js";
import type { LessonPlan } from "../domain/lesson-plan.js";
import type { LessonPlanRepository } from "../domain/lesson-plan-repository.js";

/**
 * Gera um buffer binário (.docx) com o plano formatado. A implementação fica
 * em infrastructure; o use case só valida posse e delega.
 */
export interface DocxLessonPlanBuilder {
  build(input: { plan: LessonPlan }): Promise<Buffer>;
}

interface Input {
  planId: string;
  ownerId: string;
}

export interface ExportLessonPlanDocxOutput {
  fileName: string;
  buffer: Buffer;
}

export class ExportLessonPlanDocxUseCase {
  constructor(
    private readonly plans: LessonPlanRepository,
    private readonly builder: DocxLessonPlanBuilder,
  ) {}

  async execute(input: Input): Promise<ExportLessonPlanDocxOutput> {
    const plan = await this.plans.findById(LessonPlanId.of(input.planId));
    if (!plan || !plan.isOwnedBy(input.ownerId)) {
      throw new LessonPlanNotFoundError();
    }
    const buffer = await this.builder.build({ plan });
    return { fileName: buildFileName(plan.title), buffer };
  }
}

function buildFileName(title: string): string {
  const slug =
    title
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "plano-de-aula";
  return `${slug}.docx`;
}
