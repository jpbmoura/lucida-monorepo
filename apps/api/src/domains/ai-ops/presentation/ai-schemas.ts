import { z } from "zod";

const questionTypesSchema = z
  .object({
    multipleChoice: z.boolean(),
    trueFalse: z.boolean(),
  })
  .refine((t) => t.multipleChoice || t.trueFalse, {
    message: "Selecione ao menos um tipo de questão.",
  });

// Idioma de saída do conteúdo gerado. Não é persistido — só vai pro prompt.
const outputLanguageSchema = z.enum(["pt-BR", "en", "es"]).default("pt-BR");

export const generateExamConfigSchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(50),
  difficulty: z.enum(["fácil", "médio", "difícil", "misto"]),
  style: z.enum(["simple", "contextual", "analytical", "reflective"]),
  questionTypes: questionTypesSchema,
  language: outputLanguageSchema,
  pastedText: z.string().optional(),
  youtubeUrls: z.array(z.string().url()).optional(),
});

export const regenerateQuestionConfigSchema = z.object({
  difficulty: z.enum(["fácil", "médio", "difícil", "misto"]),
  style: z.enum(["simple", "contextual", "analytical", "reflective"]),
  questionTypes: questionTypesSchema,
  language: outputLanguageSchema,
  pastedText: z.string().optional(),
  youtubeUrls: z.array(z.string().url()).optional(),
  avoidStatements: z.array(z.string()).default([]),
});

// Preço tabelado depende só de style + questionCount — não precisa de
// material nem das outras dimensões.
export const estimateExamConfigSchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(50),
  style: z.enum(["simple", "contextual", "analytical", "reflective"]),
});

// Geração de prova DISCURSIVA por IA (caminho separado do objetivo).
export const generateOpenConfigSchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(30),
  difficulty: z.enum(["fácil", "médio", "difícil", "misto"]),
  style: z.enum(["simple", "contextual", "analytical", "reflective"]),
  language: outputLanguageSchema,
  pastedText: z.string().optional(),
  youtubeUrls: z.array(z.string().url()).optional(),
});

export const estimateOpenConfigSchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(30),
});

export const regenerateOpenConfigSchema = z.object({
  difficulty: z.enum(["fácil", "médio", "difícil", "misto"]),
  style: z.enum(["simple", "contextual", "analytical", "reflective"]),
  language: outputLanguageSchema,
  pastedText: z.string().optional(),
  youtubeUrls: z.array(z.string().url()).optional(),
  avoidStatements: z.array(z.string()).default([]),
});

// Correção de discursivas por IA — body JSON (sem arquivos). As respostas a
// corrigir já estão no banco; só precisamos do exam e, opcionalmente, do
// subconjunto de submissões.
export const gradingTargetSchema = z.object({
  examId: z.string().min(1),
  submissionIds: z.array(z.string().min(1)).optional(),
});

export type GenerateExamConfigInput = z.infer<typeof generateExamConfigSchema>;
export type RegenerateQuestionConfigInput = z.infer<
  typeof regenerateQuestionConfigSchema
>;
export type EstimateExamConfigInput = z.infer<typeof estimateExamConfigSchema>;
