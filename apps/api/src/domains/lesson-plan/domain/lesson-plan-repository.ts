import type { LessonPlan } from "./lesson-plan.js";
import type { LessonPlanId } from "./lesson-plan-id.js";

export interface LessonPlanRepository {
  nextId(): LessonPlanId;
  save(plan: LessonPlan): Promise<void>;
  findById(id: LessonPlanId): Promise<LessonPlan | null>;
  /** Planos de uma turma (exclui arquivados por padrão). Ordem: createdAt desc. */
  findByClassId(
    classId: string,
    options?: { includeArchived?: boolean },
  ): Promise<LessonPlan[]>;
  /** Conta planos ativos (não arquivados) da turma — pro badge da aba. */
  countActiveByClassId(classId: string): Promise<number>;
  delete(id: LessonPlanId): Promise<void>;
  deleteByClassId(classId: string): Promise<void>;
}
