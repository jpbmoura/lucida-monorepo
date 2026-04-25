export type ExamStyle = "simple" | "contextual" | "analytical" | "reflective";
export type ExamDifficulty = "fácil" | "médio" | "difícil" | "misto";
export type QuestionType = "multipleChoice" | "trueFalse";
export type QuestionDifficulty = "fácil" | "médio" | "difícil";
export type SecurityLevel = "off" | "strict";

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

export interface WizardConfig {
  title: string;
  description: string;
  questionCount: number;
  difficulty: ExamDifficulty;
  style: ExamStyle;
  questionTypes: { multipleChoice: boolean; trueFalse: boolean };
  duration: number;
  securityLevel: SecurityLevel;
}
