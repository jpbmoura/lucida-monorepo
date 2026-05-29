import { z } from "zod";

const segmentSchema = z.enum([
  "FUNDAMENTAL",
  "MEDIO",
  "FACULDADE",
  "INFOPRODUTOR",
]);

const outputLanguageSchema = z.enum(["pt-BR", "en", "es"]).default("pt-BR");

const lessonPlanConfigSchema = z.object({
  segment: segmentSchema,
  title: z.string().min(2).max(200),
  // Opcionais: em branco, a IA infere a partir do material.
  subject: z.string().max(120).optional().default(""),
  level: z.string().max(120).optional().default(""),
  durationMinutes: z.coerce.number().int().min(1).max(600),
  language: outputLanguageSchema,
});

export const generateLessonPlanConfigSchema = lessonPlanConfigSchema.extend({
  pastedText: z.string().optional(),
  youtubeUrls: z.array(z.string().url()).optional(),
});

const bnccSkillSchema = z.object({
  code: z.string(),
  description: z.string(),
});

// Shape do plano atual mandado na regeneração de bloco (contexto pro prompt).
const lessonPlanShapeSchema = z.object({
  objectives: z.array(z.string()),
  bnccSkills: z.array(bnccSkillSchema),
  bnccVerified: z.boolean(),
  content: z.string(),
  methodology: z.string(),
  resources: z.array(z.string()),
  introduction: z.string(),
  development: z.string(),
  conclusion: z.string(),
  assessment: z.string(),
  bibliography: z.array(z.string()),
});

const blockKeySchema = z.enum([
  "objectives",
  "content",
  "methodology",
  "resources",
  "introduction",
  "development",
  "conclusion",
  "assessment",
  "bibliography",
]);

export const regenerateLessonBlockConfigSchema = lessonPlanConfigSchema.extend({
  currentPlan: lessonPlanShapeSchema,
  blockKey: blockKeySchema,
  pastedText: z.string().optional(),
  youtubeUrls: z.array(z.string().url()).optional(),
});

// Preço tabelado depende só do segmento.
export const estimateLessonPlanConfigSchema = z.object({
  segment: segmentSchema,
});

export type GenerateLessonPlanConfigInput = z.infer<
  typeof generateLessonPlanConfigSchema
>;
export type RegenerateLessonBlockConfigInput = z.infer<
  typeof regenerateLessonBlockConfigSchema
>;
