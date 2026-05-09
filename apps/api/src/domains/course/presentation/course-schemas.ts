import { z } from "zod";

export const createCourseBody = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(200).optional(),
});

export const updateCourseBody = z
  .object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(200).optional(),
  })
  .refine((v) => v.name !== undefined || v.description !== undefined, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const courseIdParam = z.object({
  id: z.string().min(1),
});

export type CreateCourseBody = z.infer<typeof createCourseBody>;
export type UpdateCourseBody = z.infer<typeof updateCourseBody>;
