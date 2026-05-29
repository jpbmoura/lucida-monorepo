import { z } from "zod";

const segmentSchema = z.enum([
  "FUNDAMENTAL",
  "MEDIO",
  "FACULDADE",
  "INFOPRODUTOR",
]);

const statusSchema = z.enum(["DRAFT", "READY", "ARCHIVED"]);

const identificationSchema = z.object({
  title: z.string().min(2).max(200),
  subject: z.string().max(120).default(""),
  level: z.string().max(120).default(""),
  durationMinutes: z.number().int().min(0).max(600).default(0),
  date: z.string().datetime().nullable().optional(),
});

const bnccSkillSchema = z.object({
  code: z.string(),
  description: z.string().default(""),
});

const contentSchema = z.object({
  objectives: z.array(z.string()).default([]),
  bnccSkills: z.array(bnccSkillSchema).default([]),
  bnccVerified: z.boolean().default(false),
  content: z.string().default(""),
  methodology: z.string().default(""),
  resources: z.array(z.string()).default([]),
  introduction: z.string().default(""),
  development: z.string().default(""),
  conclusion: z.string().default(""),
  assessment: z.string().default(""),
  bibliography: z.array(z.string()).default([]),
});

const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  credits: z.number().int().nonnegative(),
});

export const createLessonPlanBody = z.object({
  classId: z.string().min(1),
  segment: segmentSchema,
  status: statusSchema.optional(),
  identification: identificationSchema,
  content: contentSchema,
  sourceMaterialIds: z.array(z.string()).optional(),
  usage: usageSchema.nullable().optional(),
});

export const updateLessonPlanBody = z
  .object({
    identification: identificationSchema.partial().optional(),
    content: contentSchema.optional(),
    status: statusSchema.optional(),
    generatedExamId: z.string().min(1).optional(),
  })
  .refine(
    (v) =>
      v.identification !== undefined ||
      v.content !== undefined ||
      v.status !== undefined ||
      v.generatedExamId !== undefined,
    { message: "Informe ao menos um campo para atualizar." },
  );

export const archiveLessonPlanBody = z.object({ archived: z.boolean() });

export const classIdParam = z.object({ classId: z.string().min(1) });
export const lessonPlanIdParam = z.object({ id: z.string().min(1) });
export const listLessonPlansQuery = z.object({
  includeArchived: z.coerce.boolean().default(false),
});
