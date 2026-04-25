import { z } from "zod";

const questionTypesSchema = z.object({
  multipleChoice: z.boolean(),
  trueFalse: z.boolean(),
});

export const generateExamConfigSchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(50),
  difficulty: z.enum(["fácil", "médio", "difícil", "misto"]),
  style: z.enum(["simple", "contextual", "analytical", "reflective"]),
  questionTypes: questionTypesSchema,
  pastedText: z.string().optional(),
  youtubeUrls: z.array(z.string().url()).optional(),
});

export const regenerateQuestionConfigSchema = z.object({
  difficulty: z.enum(["fácil", "médio", "difícil", "misto"]),
  style: z.enum(["simple", "contextual", "analytical", "reflective"]),
  questionTypes: questionTypesSchema,
  pastedText: z.string().optional(),
  youtubeUrls: z.array(z.string().url()).optional(),
  avoidStatements: z.array(z.string()).default([]),
});

export type GenerateExamConfigInput = z.infer<typeof generateExamConfigSchema>;
export type RegenerateQuestionConfigInput = z.infer<
  typeof regenerateQuestionConfigSchema
>;
