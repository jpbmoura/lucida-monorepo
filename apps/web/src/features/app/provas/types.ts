export type ExamStyle = "simple" | "contextual" | "analytical" | "reflective";
export type ExamDifficulty = "fácil" | "médio" | "difícil" | "misto";
export type QuestionType = "multipleChoice" | "trueFalse" | "open";
export type QuestionDifficulty = "fácil" | "médio" | "difícil";
export type SecurityLevel = "off" | "strict";
// Idioma de saída do conteúdo gerado pela IA. Não é persistido — só vai no
// payload da geração pro prompt.
export type OutputLanguage = "pt-BR" | "en" | "es";

export interface RubricLevelDraft {
  id: string;
  label: string;
  points: number;
  descriptor: string;
}

export interface RubricCriterionDraft {
  id: string;
  name: string;
  description: string | null;
  levels: RubricLevelDraft[];
}

export interface RubricDraft {
  criteria: RubricCriterionDraft[];
}

export interface GeneratedQuestion {
  type: QuestionType;
  statement: string;
  context: string | null;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: QuestionDifficulty;
  // Só para discursivas (`type: "open"`).
  rubric?: RubricDraft | null;
  referenceAnswer?: string | null;
}

export interface GenerationUsage {
  inputTokens: number;
  outputTokens: number;
  credits: number;
}

export interface GenerationResult {
  questions: GeneratedQuestion[];
  usage: GenerationUsage;
}

// Resultado da geração de prova DISCURSIVA por IA (caminho separado).
export interface GeneratedOpenQuestionResult {
  statement: string;
  context: string | null;
  referenceAnswer: string | null;
  rubric: RubricDraft;
  difficulty: QuestionDifficulty;
}

export interface OpenGenerationResult {
  questions: GeneratedOpenQuestionResult[];
  usage: GenerationUsage;
}

export interface GenerationProgress {
  round: number;
  totalRounds: number;
  delivered: number;
  requested: number;
}

export interface WizardConfig {
  title: string;
  description: string;
  /** Número de questões OBJETIVAS (múltipla escolha / V/F). */
  questionCount: number;
  /** Número de questões DISCURSIVAS. */
  openQuestionCount: number;
  difficulty: ExamDifficulty;
  style: ExamStyle;
  questionTypes: { multipleChoice: boolean; trueFalse: boolean; open: boolean };
  language: OutputLanguage;
  duration: number;
  securityLevel: SecurityLevel;
}
