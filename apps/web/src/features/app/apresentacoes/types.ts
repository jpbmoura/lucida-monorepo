// Tipos do módulo "Apresentações" (slides). Espelham os DTOs do backend
// (apps/api/src/domains/slide-deck) e o resultado de geração do ai-ops.

export type SlideTheme = "papel" | "minimo" | "lousa" | "ludico" | "vivido";
export type SlideTone = "didatico" | "descontraido" | "formal" | "inspirador";
export type SlideDeckStatus = "DRAFT" | "READY" | "ERROR";
export type SlideSourceType = "lesson-plan" | "material";
export type OutputLanguage = "pt-BR" | "en" | "es";

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

export interface ParagraphBlock {
  kind: "paragraph";
  text: string;
  emphasis: boolean;
}
export interface BulletsBlock {
  kind: "bullets";
  items: string[];
}
export interface FormulaBlock {
  kind: "formula";
  latex: string;
}
export interface CalloutBlock {
  kind: "callout";
  text: string;
  variant: CalloutVariant;
}
export type SlideBlock =
  | ParagraphBlock
  | BulletsBlock
  | FormulaBlock
  | CalloutBlock;

export interface SlideColumn {
  heading: string | null;
  blocks: SlideBlock[];
}

export interface SlideImage {
  query: string;
  required: boolean;
  alt: string;
  url: string | null;
  thumbUrl: string | null;
  photographer: string | null;
  photographerUrl: string | null;
  sourceUrl: string | null;
}

export interface Slide {
  id: string;
  type: SlideType;
  title: string;
  subtitle: string | null;
  blocks: SlideBlock[];
  columns: SlideColumn[];
  image: SlideImage | null;
  notes: string | null;
  bnccCodes: string[];
}

export interface SlideDeckSource {
  type: SlideSourceType;
  ref: string | null;
}

export interface GenerationUsage {
  inputTokens: number;
  outputTokens: number;
  credits: number;
}

export interface SlideDeckDTO {
  id: string;
  ownerId: string;
  organizationId: string | null;
  courseId: string | null;
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
  theme: SlideTheme;
  source: SlideDeckSource;
  slides: Slide[];
  status: SlideDeckStatus;
  usage: GenerationUsage | null;
  createdAt: string;
  updatedAt: string;
}

// Resultado da geração (SSE event "result").
export interface GenerateDeckResult {
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
  suggestedTheme: SlideTheme;
  slides: Slide[];
  usage: GenerationUsage;
}

export interface RegenerateSlideResult {
  slide: Slide;
  usage: GenerationUsage;
}

// Progresso slide-a-slide (SSE event "progress").
export interface SlideGenerationProgress {
  delivered: number;
  requested: number;
  slide?: Slide;
}

// Config da apresentação preenchida no wizard.
export interface DeckConfig {
  source: SlideSourceType;
  lessonPlanId: string | null;
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
  slideCount: number;
  includeNotes: boolean;
  includeActivity: boolean;
  language: OutputLanguage;
}

export const TONE_META: Record<SlideTone, { label: string; description: string }> = {
  didatico: { label: "Didático", description: "Claro e direto, como em sala." },
  descontraido: { label: "Descontraído", description: "Leve e próximo do aluno." },
  formal: { label: "Formal", description: "Acadêmico e impessoal." },
  inspirador: { label: "Inspirador", description: "Desperta curiosidade." },
};

export const SLIDE_TYPE_LABEL: Record<SlideType, string> = {
  cover: "Capa",
  section: "Seção",
  content: "Conteúdo",
  "two-column": "Duas colunas",
  comparison: "Comparação",
  quote: "Citação",
  formula: "Fórmula",
  activity: "Atividade",
  summary: "Síntese",
};
