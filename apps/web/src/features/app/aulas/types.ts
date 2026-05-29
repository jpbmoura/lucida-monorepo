// Tipos compartilhados do módulo "Aulas" (planos de aula). Espelham os DTOs do
// backend (apps/api/src/domains/lesson-plan).

export type LessonPlanSegment =
  | "FUNDAMENTAL"
  | "MEDIO"
  | "FACULDADE"
  | "INFOPRODUTOR";

export type LessonPlanStatus = "DRAFT" | "READY" | "ARCHIVED";

export type OutputLanguage = "pt-BR" | "en" | "es";

export type LessonPlanBlockKey =
  | "objectives"
  | "content"
  | "methodology"
  | "resources"
  | "introduction"
  | "development"
  | "conclusion"
  | "assessment"
  | "bibliography";

export interface BnccSkill {
  code: string;
  description: string;
}

export interface LessonPlanContent {
  objectives: string[];
  bnccSkills: BnccSkill[];
  bnccVerified: boolean;
  content: string;
  methodology: string;
  resources: string[];
  introduction: string;
  development: string;
  conclusion: string;
  assessment: string;
  bibliography: string[];
}

export interface GenerationUsage {
  inputTokens: number;
  outputTokens: number;
  credits: number;
}

export interface GenerateLessonPlanResult {
  plan: LessonPlanContent;
  /** Disciplina/nível efetivos — informados pelo professor ou inferidos pela IA. */
  subject: string;
  level: string;
  usage: GenerationUsage;
}

export interface RegenerateBlockResult {
  block: Partial<LessonPlanContent>;
  usage: GenerationUsage;
}

// Config da aula (identificação) — preenchida no wizard.
export interface AulaConfig {
  segment: LessonPlanSegment;
  title: string;
  subject: string;
  level: string;
  durationMinutes: number;
  language: OutputLanguage;
}

export interface LessonPlanIdentification {
  title: string;
  subject: string;
  level: string;
  durationMinutes: number;
  date: string | null;
}

export interface LessonPlanDTO {
  id: string;
  classId: string;
  segment: LessonPlanSegment;
  status: LessonPlanStatus;
  identification: LessonPlanIdentification;
  content: LessonPlanContent;
  generatedExamId: string | null;
  generatedMaterialId: string | null;
  usage: GenerationUsage | null;
  createdAt: string;
  updatedAt: string;
}

export interface LessonPlanListItem {
  id: string;
  segment: LessonPlanSegment;
  status: LessonPlanStatus;
  title: string;
  subject: string;
  level: string;
  durationMinutes: number;
  generatedExamId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Metadados de apresentação dos segmentos (labels pt-BR + descrição curta).
export const SEGMENT_META: Record<
  LessonPlanSegment,
  { label: string; description: string; hasBncc: boolean }
> = {
  FUNDAMENTAL: {
    label: "Fundamental",
    description: "Anos iniciais e finais — alinhado à BNCC.",
    hasBncc: true,
  },
  MEDIO: {
    label: "Médio",
    description: "Ensino Médio — BNCC e conexões com o ENEM.",
    hasBncc: true,
  },
  FACULDADE: {
    label: "Faculdade",
    description: "Ensino superior — ementa e bibliografia.",
    hasBncc: false,
  },
  INFOPRODUTOR: {
    label: "Curso livre",
    description: "Infoproduto — roteiro, gancho e CTA.",
    hasBncc: false,
  },
};

export const BLOCK_META: Record<
  LessonPlanBlockKey,
  { label: string; kind: "text" | "list" }
> = {
  objectives: { label: "Objetivos de aprendizagem", kind: "list" },
  content: { label: "Conteúdo", kind: "text" },
  methodology: { label: "Metodologia", kind: "text" },
  resources: { label: "Recursos", kind: "list" },
  introduction: { label: "Introdução", kind: "text" },
  development: { label: "Desenvolvimento", kind: "text" },
  conclusion: { label: "Conclusão", kind: "text" },
  assessment: { label: "Avaliação", kind: "text" },
  bibliography: { label: "Bibliografia", kind: "list" },
};
