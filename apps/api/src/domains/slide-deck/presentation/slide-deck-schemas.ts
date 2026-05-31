import { z } from "zod";

// Contrato Zod do deck — valida os slides vindos do front (que os recebeu da
// geração) na criação/edição. É a fonte de verdade da FORMA do conteúdo do
// slide; o ai-ops importa o `slideSchema` daqui pra validar a regeneração.

export const slideTypeSchema = z.enum([
  "cover",
  "section",
  "content",
  "two-column",
  "comparison",
  "quote",
  "formula",
  "activity",
  "summary",
]);

export const slideToneSchema = z.enum([
  "didatico",
  "descontraido",
  "formal",
  "inspirador",
]);

export const slideThemeSchema = z.enum([
  "papel",
  "minimo",
  "lousa",
  "ludico",
  "vivido",
]);

const calloutVariantSchema = z.enum(["term", "note", "example", "warning"]);

const blockSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("paragraph"),
    text: z.string(),
    emphasis: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("bullets"),
    items: z.array(z.string()),
  }),
  z.object({
    kind: z.literal("formula"),
    latex: z.string(),
  }),
  z.object({
    kind: z.literal("callout"),
    text: z.string(),
    variant: calloutVariantSchema,
  }),
]);

const slideImageSchema = z.object({
  query: z.string(),
  required: z.boolean(),
  alt: z.string(),
  url: z.string().nullable(),
  thumbUrl: z.string().nullable(),
  photographer: z.string().nullable(),
  photographerUrl: z.string().nullable(),
  sourceUrl: z.string().nullable(),
});

const slideColumnSchema = z.object({
  heading: z.string().nullable(),
  blocks: z.array(blockSchema),
});

export const slideSchema = z.object({
  id: z.string().min(1),
  type: slideTypeSchema,
  title: z.string(),
  subtitle: z.string().nullable(),
  blocks: z.array(blockSchema),
  columns: z.array(slideColumnSchema),
  image: slideImageSchema.nullable(),
  notes: z.string().nullable(),
  bnccCodes: z.array(z.string()),
});

const sourceSchema = z.object({
  type: z.enum(["lesson-plan", "material"]),
  ref: z.string().nullable(),
});

const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  credits: z.number().int().nonnegative(),
});

export const createSlideDeckBody = z.object({
  courseId: z.string().nullable().optional(),
  title: z.string().min(2).max(200),
  subject: z.string().max(160).default(""),
  gradeLevel: z.string().max(120).default(""),
  tone: slideToneSchema,
  theme: slideThemeSchema,
  source: sourceSchema,
  slides: z.array(slideSchema).min(1),
  usage: usageSchema.nullable().optional(),
});

export const updateSlideDeckBody = z
  .object({
    title: z.string().min(2).max(200).optional(),
    subject: z.string().max(160).optional(),
    gradeLevel: z.string().max(120).optional(),
    tone: slideToneSchema.optional(),
    theme: slideThemeSchema.optional(),
    courseId: z.string().nullable().optional(),
    slides: z.array(slideSchema).min(1).optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.subject !== undefined ||
      v.gradeLevel !== undefined ||
      v.tone !== undefined ||
      v.theme !== undefined ||
      v.courseId !== undefined ||
      v.slides !== undefined,
    { message: "Informe ao menos um campo para atualizar." },
  );

export const reorderSlidesBody = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const slideDeckIdParam = z.object({ id: z.string().min(1) });

export type SlideInput = z.infer<typeof slideSchema>;
