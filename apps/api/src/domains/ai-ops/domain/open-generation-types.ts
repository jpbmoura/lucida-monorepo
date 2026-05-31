import type {
  ExamStyle,
  ExtractionResult,
  GenerationProgress,
  GenerationUsage,
  OutputLanguage,
  QuestionDifficulty,
} from "./generation-types.js";

// Geração de questões DISCURSIVAS + rubrica por IA. Caminho separado do gerador
// objetivo: o contrato de saída é outro (enunciado + resposta-modelo + rubrica,
// sem alternativas/gabarito). A nota nasce da rubrica na correção, não aqui.

export interface GeneratedRubricLevel {
  id: string;
  label: string;
  points: number;
  descriptor: string;
}

export interface GeneratedRubricCriterion {
  id: string;
  name: string;
  description: string | null;
  levels: GeneratedRubricLevel[];
}

export interface GeneratedRubric {
  criteria: GeneratedRubricCriterion[];
}

export interface GeneratedOpenQuestion {
  statement: string;
  context: string | null;
  referenceAnswer: string | null;
  rubric: GeneratedRubric;
  difficulty: "fácil" | "médio" | "difícil";
}

export interface OpenGenerationConfig {
  questionCount: number;
  difficulty: QuestionDifficulty;
  style: ExamStyle;
  language: OutputLanguage;
}

export interface OpenGenerationResult {
  questions: GeneratedOpenQuestion[];
  usage: GenerationUsage;
}

/** Port — implementado por OpenAi (infra). */
export interface OpenQuestionGenerator {
  generate(input: {
    config: OpenGenerationConfig;
    sources: ExtractionResult[];
    /** Enunciados a evitar (usado pelo regenerate pra não repetir). */
    avoidStatements?: string[];
    onProgress?: (p: GenerationProgress) => void;
  }): Promise<OpenGenerationResult>;
}
