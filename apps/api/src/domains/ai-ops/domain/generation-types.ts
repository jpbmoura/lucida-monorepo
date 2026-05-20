// Tipos compartilhados entre application e infrastructure do AI-ops.

export type ExamStyle = "simple" | "contextual" | "analytical" | "reflective";
export type QuestionType = "multipleChoice" | "trueFalse";
export type QuestionDifficulty = "fácil" | "médio" | "difícil" | "misto";

export interface GenerationConfig {
  questionCount: number;
  difficulty: QuestionDifficulty;
  questionTypes: {
    multipleChoice: boolean;
    trueFalse: boolean;
  };
  style: ExamStyle;
}

export interface SourceFile {
  filename: string;
  mimetype: string;
  buffer: Buffer;
}

export interface GeneratedQuestion {
  type: "multipleChoice" | "trueFalse";
  statement: string;
  context: string | null;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "fácil" | "médio" | "difícil";
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

export interface ExtractionResult {
  text: string;
  sourceLabel: string; // "arquivo.pdf", "texto colado", etc.
}

// Progresso emitido a cada rodada do top-up loop. Geração multi-round de
// material raso pode levar minutos; o front usa isso pra não ficar um
// spinner mudo.
export interface GenerationProgress {
  /** Rodada concluída (1-based). */
  round: number;
  /** Teto de rodadas (1 inicial + top-ups). */
  totalRounds: number;
  /** Questões já acumuladas. */
  delivered: number;
  /** Quantas foram pedidas. */
  requested: number;
}

// Interface — implementada por OpenAi (infra). Use case depende desta.
export interface QuestionGenerator {
  generate(input: {
    config: GenerationConfig;
    sources: ExtractionResult[];
    avoidStatements?: string[]; // usado pelo regenerate: evita questões já existentes
    onProgress?: (p: GenerationProgress) => void;
  }): Promise<GenerationResult>;
}

// Interface — um por tipo de arquivo (pdf/docx/txt).
export interface FileExtractor {
  supports(mimetype: string, filename: string): boolean;
  extract(file: SourceFile): Promise<string>;
}
