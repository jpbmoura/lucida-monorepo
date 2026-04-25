import { z } from "zod";

export const shareIdParam = z.object({ shareId: z.string().min(1) });
export const examIdParam = z.object({ examId: z.string().min(1) });

export const beginExamBody = z.object({
  studentCode: z.string().regex(/^[0-9]{7}$/, "Código precisa ter 7 dígitos."),
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
