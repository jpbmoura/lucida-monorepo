// Tipos compartilhados entre application e infrastructure do AI-ops para a
// geração de SLIDES (módulo "Apresentações"). Espelha lesson-plan-generation-
// types.ts: o artefato gerado é um deck (conteúdo + esquema de layout), nunca
// HTML cru. Estes tipos são INDEPENDENTES do domínio slide-deck (DDD por
// feature) — têm a mesma forma, mas não se importam. O controller mapeia entre
// os dois.

import type {
  ExtractionResult,
  GenerationUsage,
  OutputLanguage,
} from "./generation-types.js";

// Espelha SlideTheme / SlideTone do domínio slide-deck (sem importar).
export type SlideTheme = "papel" | "minimo" | "lousa" | "ludico" | "vivido";
export type SlideTone = "didatico" | "descontraido" | "formal" | "inspirador";

// De onde o deck nasce — afeta resolução da fonte e preço (plano sai mais
// barato que material cru).
export type SlideSourceType = "lesson-plan" | "material";

export type SlideType =
  | "cover"
  | "section"
  | "content"
  | "two-column"
  | "comparison"
  | "quote"
  | "formula"
  | "activity"
  | "summary";

export type CalloutVariant = "term" | "note" | "example" | "warning";

export interface GeneratedParagraphBlock {
  kind: "paragraph";
  text: string;
  emphasis: boolean;
}
export interface GeneratedBulletsBlock {
  kind: "bullets";
  items: string[];
}
export interface GeneratedFormulaBlock {
  kind: "formula";
  latex: string;
}
export interface GeneratedCalloutBlock {
  kind: "callout";
  text: string;
  variant: CalloutVariant;
}

export type GeneratedSlideBlock =
  | GeneratedParagraphBlock
  | GeneratedBulletsBlock
  | GeneratedFormulaBlock
  | GeneratedCalloutBlock;

export interface GeneratedSlideColumn {
  heading: string | null;
  blocks: GeneratedSlideBlock[];
}

// A IA só preenche a parte de BUSCA (query/required/alt); os campos resolvidos
// (url/crédito) são preenchidos depois pelo ImageProvider (Pexels) no pipeline.
// Mesma forma do SlideImage do domínio slide-deck (sem importar).
export interface GeneratedSlideImage {
  query: string;
  required: boolean;
  alt: string;
  url: string | null;
  thumbUrl: string | null;
  photographer: string | null;
  photographerUrl: string | null;
  sourceUrl: string | null;
}

export interface GeneratedSlide {
  id: string;
  type: SlideType;
  title: string;
  subtitle: string | null;
  blocks: GeneratedSlideBlock[];
  columns: GeneratedSlideColumn[];
  image: GeneratedSlideImage | null;
  notes: string | null;
  bnccCodes: string[];
}

export interface SlideDeckGenerationConfig {
  source: SlideSourceType;
  /** Tema/título da apresentação. Quando vazio, a IA infere do material/plano. */
  title: string;
  subject: string;
  /** Ano/série/período (ex: "9º ano", "3º semestre"). */
  gradeLevel: string;
  tone: SlideTone;
  /** Nº de slides desejado. */
  slideCount: number;
  /** Incluir notas do apresentador em cada slide. */
  includeNotes: boolean;
  /** Incluir um slide de atividade de saída. */
  includeActivity: boolean;
  language: OutputLanguage;
}

export interface SlideDeckGenerationResult {
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
  /** Tema sugerido pela IA (disciplina + série). O front pré-seleciona. */
  suggestedTheme: SlideTheme;
  slides: GeneratedSlide[];
  usage: GenerationUsage;
}

export interface RegenerateSlideResult {
  slide: GeneratedSlide;
  usage: GenerationUsage;
}

// Progresso emitido slide-a-slide durante a geração (SSE). O front renderiza os
// slides conforme chegam.
export interface SlideGenerationProgress {
  /** Slides já gerados. */
  delivered: number;
  /** Total pedido. */
  requested: number;
  /** Último slide concluído (pra render incremental). */
  slide?: GeneratedSlide;
}

// Interface — implementada por OpenAi (infra). Os use cases dependem desta.
export interface SlideDeckGenerator {
  generate(input: {
    config: SlideDeckGenerationConfig;
    sources: ExtractionResult[];
    onProgress?: (p: SlideGenerationProgress) => void;
  }): Promise<SlideDeckGenerationResult>;

  // Regenera UM slide, mantendo os outros no prompt como contexto pra coerência
  // do arco pedagógico. Devolve só o slide regenerado.
  regenerateSlide(input: {
    config: SlideDeckGenerationConfig;
    currentSlides: GeneratedSlide[];
    slideId: string;
    sources: ExtractionResult[];
  }): Promise<RegenerateSlideResult>;
}
