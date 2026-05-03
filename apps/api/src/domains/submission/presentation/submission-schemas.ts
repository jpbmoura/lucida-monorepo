import { z } from "zod";

export const shareIdParam = z.object({ shareId: z.string().min(1) });
export const examIdParam = z.object({ examId: z.string().min(1) });

export const beginExamBody = z.object({
  studentCode: z.string().regex(/^[0-9]{7}$/, "Código precisa ter 7 dígitos."),
});

export const beginExamFromTokenBody = z.object({
  /** Token assinado emitido por POST /v1/public/exams/:id/share-link. */
  token: z.string().min(1),
});

export const beginExamByEmailBody = z.object({
  email: z.string().trim().email("Email inválido."),
  name: z
    .string()
    .trim()
    .min(2, "Nome precisa ter ao menos 2 caracteres.")
    .max(120, "Nome não pode passar de 120 caracteres."),
});

const integrityFlagsSchema = z
  .object({
    tabSwitches: z.number().int().nonnegative().default(0),
    focusLosses: z.number().int().nonnegative().default(0),
    copyAttempts: z.number().int().nonnegative().default(0),
    rightClickAttempts: z.number().int().nonnegative().default(0),
    violationCount: z.number().int().nonnegative().default(0),
  })
  .partial()
  .optional();

export const submitExamBody = z.object({
  submissionId: z.string().min(1),
  answers: z.array(z.number().int().nonnegative().nullable()),
  endReason: z
    .enum(["submitted", "time_expired", "violation"])
    .default("submitted"),
  integrityFlags: integrityFlagsSchema,
});
