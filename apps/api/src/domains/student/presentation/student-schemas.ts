import { z } from "zod";

export const createStudentBody = z.object({
  name: z.string().min(2).max(120),
  matricula: z.string().min(1).max(40),
  email: z.string().email().optional().nullable(),
});

export const updateStudentBody = z
  .object({
    name: z.string().min(2).max(120).optional(),
    matricula: z.string().min(1).max(40).optional(),
    email: z.string().email().nullable().optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined || v.matricula !== undefined || v.email !== undefined,
    { message: "Informe ao menos um campo para atualizar." },
  );

export const classIdParam = z.object({ classId: z.string().min(1) });
export const studentIdParam = z.object({ id: z.string().min(1) });
