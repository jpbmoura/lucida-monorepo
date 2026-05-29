import type {
  BnccSkill,
  LessonPlan,
  LessonPlanSegment,
  LessonPlanStatus,
} from "../domain/lesson-plan.js";

export interface LessonPlanDTO {
  id: string;
  classId: string;
  segment: LessonPlanSegment;
  status: LessonPlanStatus;
  identification: {
    title: string;
    subject: string;
    level: string;
    durationMinutes: number;
    date: string | null;
  };
  content: {
    objectives: string[];
    bnccSkills: BnccSkill[];
    bnccVerified: boolean;
    content: string;
    methodology: string;
    resources: string[];
    introduction: string;
    development: string;
    conclusion: string;
    assessment: string;
    bibliography: string[];
  };
  generatedExamId: string | null;
  generatedMaterialId: string | null;
  usage: { inputTokens: number; outputTokens: number; credits: number } | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toLessonPlanDTO(plan: LessonPlan): LessonPlanDTO {
  const id = plan.identification;
  return {
    id: plan.id.toString(),
    classId: plan.classId,
    segment: plan.segment,
    status: plan.status,
    identification: {
      title: id.title,
      subject: id.subject,
      level: id.level,
      durationMinutes: id.durationMinutes,
      date: id.date ? id.date.toISOString() : null,
    },
    content: plan.content,
    generatedExamId: plan.generatedExamId,
    generatedMaterialId: plan.generatedMaterialId,
    usage: plan.usage,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}
