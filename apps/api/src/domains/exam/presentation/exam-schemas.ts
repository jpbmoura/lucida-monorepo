import { z } from "zod";

const questionSchema = z.object({
  type: z.enum(["multipleChoice", "trueFalse"]),
  statement: z.string().min(3),
  context: z.string().nullable().optional(),
  options: z.array(z.string()).min(2).max(6),
  correctAnswer: z.number().int().nonnegative(),
  explanation: z.string().optional(),
  difficulty: z.enum(["fácil", "médio", "difícil"]),
});

const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  credits: z.number().int().nonnegative(),
});

export const createExamBody = z.object({
  classId: z.string().min(1),
  title: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  style: z.enum(["simple", "contextual", "analytical", "reflective"]),
  duration: z.number().int().min(0).max(600).optional(),
  securityLevel: z.enum(["off", "strict"]).optional(),
  questions: z.array(questionSchema).min(1),
  usage: usageSchema.nullable().optional(),
});

export const updateExamBody = z
  .object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(500).optional(),
    duration: z.number().int().min(0).max(600).optional(),
    securityLevel: z.enum(["off", "strict"]).optional(),
    questions: z.array(questionSchema).min(1).optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.description !== undefined ||
      v.duration !== undefined ||
      v.securityLevel !== undefined ||
      v.questions !== undefined,
    { message: "Informe ao menos um campo para atualizar." },
  );

export const copyExamBody = z.object({ targetClassId: z.string().min(1) });

export const classIdParam = z.object({ classId: z.string().min(1) });
export const examIdParam = z.object({ id: z.string().min(1) });

export const exportExamQuery = z.object({
  version: z.enum(["student", "answer_key", "both"]).default("student"),
});
