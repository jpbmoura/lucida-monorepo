import { z } from "zod";

export const createClassBody = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(200).optional(),
});

export const updateClassBody = z
  .object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(200).optional(),
  })
  .refine((v) => v.name !== undefined || v.description !== undefined, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const classIdParam = z.object({
  id: z.string().min(1),
});

export type CreateClassBody = z.infer<typeof createClassBody>;
export type UpdateClassBody = z.infer<typeof updateClassBody>;
