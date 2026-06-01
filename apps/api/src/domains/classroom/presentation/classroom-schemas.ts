import { z } from "zod";

export const importCourseBody = z
  .object({
    className: z.string().min(2).max(120),
    courseId: z.string().min(1).optional(),
    newCourseName: z.string().min(2).max(120).optional(),
  })
  .refine((v) => Boolean(v.courseId) !== Boolean(v.newCourseName), {
    message: "Escolha um curso existente OU informe o nome de um novo (um dos dois).",
  });

export const classroomCourseIdParam = z.object({
  classroomCourseId: z.string().min(1),
});

export const classIdParam = z.object({
  classId: z.string().min(1),
});

/** Query do callback OAuth — pode chegar com erro (usuário negou consentimento). */
export const oauthCallbackQuery = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export type ImportCourseBody = z.infer<typeof importCourseBody>;
