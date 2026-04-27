import { z } from "zod";
import {
  ROADMAP_PRODUCTS,
  ROADMAP_STAGES,
  STAFF_CREATABLE_STAGES,
} from "../domain/roadmap-types.js";

export const productEnum = z.enum(ROADMAP_PRODUCTS);
export const stageEnum = z.enum(ROADMAP_STAGES);
export const staffCreatableStageEnum = z.enum(
  STAFF_CREATABLE_STAGES as [string, ...string[]],
);

export const listRoadmapQuery = z.object({
  product: productEnum.optional(),
});

export const itemIdParam = z.object({
  id: z.string().min(1),
});

export const suggestFeatureBody = z.object({
  title: z.string().min(4).max(120),
  description: z.string().max(1000).optional(),
  product: productEnum,
});

export const createRoadmapItemBody = z.object({
  title: z.string().min(4).max(120),
  description: z.string().max(1000).optional(),
  product: productEnum,
  stage: staffCreatableStageEnum,
  staffNote: z.string().max(500).nullable().optional(),
});

export const updateRoadmapItemBody = z
  .object({
    title: z.string().min(4).max(120).optional(),
    description: z.string().max(1000).optional(),
    product: productEnum.optional(),
    stage: stageEnum.optional(),
    // null explícito → limpa; undefined → não mexe.
    staffNote: z.string().max(500).nullable().optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.description !== undefined ||
      v.product !== undefined ||
      v.stage !== undefined ||
      v.staffNote !== undefined,
    { message: "Informe ao menos um campo para atualizar." },
  );

export type ListRoadmapQuery = z.infer<typeof listRoadmapQuery>;
export type SuggestFeatureBody = z.infer<typeof suggestFeatureBody>;
export type CreateRoadmapItemBody = z.infer<typeof createRoadmapItemBody>;
export type UpdateRoadmapItemBody = z.infer<typeof updateRoadmapItemBody>;
