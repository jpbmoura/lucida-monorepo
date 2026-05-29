export type ExamStyle = "simple" | "contextual" | "analytical" | "reflective";
export type ExamDifficulty = "fácil" | "médio" | "difícil" | "misto";
export type QuestionType = "multipleChoice" | "trueFalse";
export type QuestionDifficulty = "fácil" | "médio" | "difícil";
export type SecurityLevel = "off" | "strict";
// Idioma de saída do conteúdo gerado pela IA. Não é persistido — só vai no
// payload da geração pro prompt.
export type OutputLanguage = "pt-BR" | "en" | "es";

export interface GeneratedQuestion {
  type: QuestionType;
  statement: string;
  context: string | null;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: QuestionDifficulty;
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

export interface GenerationProgress {
  round: number;
  totalRounds: number;
  delivered: number;
  requested: number;
}

export interface WizardConfig {
  title: string;
  description: string;
  questionCount: number;
  difficulty: ExamDifficulty;
  style: ExamStyle;
  questionTypes: { multipleChoice: boolean; trueFalse: boolean };
  language: OutputLanguage;
  duration: number;
  securityLevel: SecurityLevel;
}
