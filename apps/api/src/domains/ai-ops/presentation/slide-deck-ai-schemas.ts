import { z } from "zod";
import {
  slideSchema,
  slideToneSchema,
} from "@/domains/slide-deck/presentation/slide-deck-schemas.js";

const outputLanguageSchema = z.enum(["pt-BR", "en", "es"]).default("pt-BR");
const sourceTypeSchema = z.enum(["lesson-plan", "material"]);

// Config comum da geração de deck (vem como JSON no campo `config` do form-data).
const baseDeckConfigSchema = z.object({
  source: sourceTypeSchema,
  /** Obrigatório quando source = "lesson-plan": o backend carrega e renderiza o plano. */
  lessonPlanId: z.string().min(1).optional(),
  // Opcionais: em branco, a IA infere a partir do material/plano.
  title: z.string().max(200).optional().default(""),
  subject: z.string().max(160).optional().default(""),
  gradeLevel: z.string().max(120).optional().default(""),
  tone: slideToneSchema.default("didatico"),
  slideCount: z.coerce.number().int().min(3).max(30),
  includeNotes: z.boolean().optional().default(false),
  includeActivity: z.boolean().optional().default(true),
  language: outputLanguageSchema,
  pastedText: z.string().optional(),
  youtubeUrls: z.array(z.string().url()).optional(),
});

const requireLessonPlanId = (v: { source: string; lessonPlanId?: string }) =>
  v.source !== "lesson-plan" || !!v.lessonPlanId;

export const generateDeckConfigSchema = baseDeckConfigSchema.refine(
  requireLessonPlanId,
  { message: "lessonPlanId é obrigatório quando a fonte é um plano de aula.", path: ["lessonPlanId"] },
);

export const regenerateSlideConfigSchema = baseDeckConfigSchema
  .extend({
    currentSlides: z.array(slideSchema).min(1),
    slideId: z.string().min(1),
  })
  .refine(requireLessonPlanId, {
    message: "lessonPlanId é obrigatório quando a fonte é um plano de aula.",
    path: ["lessonPlanId"],
  });

// Preço tabelado depende só da fonte + nº de slides.
export const estimateDeckConfigSchema = z.object({
  source: sourceTypeSchema,
  slideCount: z.coerce.number().int().min(3).max(30),
});

export type GenerateDeckConfigInput = z.infer<typeof generateDeckConfigSchema>;
export type RegenerateSlideConfigInput = z.infer<
  typeof regenerateSlideConfigSchema
>;
