import { z } from "zod";

const difficultyEnum = z.enum(["fácil", "médio", "difícil"]);

const rubricLevelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  points: z.number().nonnegative(),
  descriptor: z.string().optional().default(""),
});

const rubricSchema = z.object({
  criteria: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().nullable().optional(),
        levels: z.array(rubricLevelSchema).min(2),
      }),
    )
    .min(1),
});

const objectiveBase = {
  statement: z.string().min(3),
  context: z.string().nullable().optional(),
  correctAnswer: z.number().int().nonnegative(),
  explanation: z.string().optional(),
  difficulty: difficultyEnum,
};

const multipleChoiceQuestionSchema = z.object({
  type: z.literal("multipleChoice"),
  options: z.array(z.string()).min(2).max(6),
  ...objectiveBase,
});

const trueFalseQuestionSchema = z.object({
  type: z.literal("trueFalse"),
  options: z.array(z.string()).length(2),
  ...objectiveBase,
});

const openQuestionSchema = z.object({
  type: z.literal("open"),
  statement: z.string().min(3),
  context: z.string().nullable().optional(),
  explanation: z.string().optional(),
  difficulty: difficultyEnum,
  rubric: rubricSchema,
  referenceAnswer: z.string().nullable().optional(),
});

const questionSchema = z.discriminatedUnion("type", [
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  openQuestionSchema,
]);

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
