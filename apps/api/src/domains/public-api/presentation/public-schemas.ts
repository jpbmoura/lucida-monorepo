import { z } from "zod";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export const listClassesQuery = z.object({
  cursor: z.string().min(1).optional(),
  /**
   * Coerção pra integer. Aceita string ou number do query — Express dá
   * sempre string, mas mantemos union pra cobrir testes que mandam
   * número direto.
   */
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT),
  teacherId: z.string().min(1).optional(),
});

export const createClassBody = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(200).optional(),
  subject: z.string().max(80).optional(),
  grade: z.string().max(30).optional(),
  teacherId: z.string().min(1),
});

export const classIdParam = z.object({
  id: z.string().min(1),
});

export const examIdParam = z.object({
  id: z.string().min(1),
});

export const issueExamLinkBody = z.object({
  matricula: z.string().min(1).max(40),
});

export const createStudentsBatchBody = z.object({
  students: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        matricula: z.string().min(1).max(40),
        email: z.string().email().optional().nullable(),
      }),
    )
    .min(1)
    .max(500),
});

export type ListClassesQuery = z.infer<typeof listClassesQuery>;
export type CreateClassBody = z.infer<typeof createClassBody>;
export type CreateStudentsBatchBody = z.infer<typeof createStudentsBatchBody>;
