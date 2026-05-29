// Tipos compartilhados entre application e infrastructure do AI-ops para a
// geração de PLANOS DE AULA (módulo "Aulas"). Espelha generation-types.ts (que
// cobre provas), mas o artefato gerado é um plano estruturado em blocos, não
// uma lista de questões.

import type {
  ExtractionResult,
  GenerationUsage,
  OutputLanguage,
} from "./generation-types.js";

// Os 4 segmentos descobertos (ver brief seção 3). Cada um tem vocabulário,
// campos e prompt template próprios — não é o mesmo formulário com rótulos
// diferentes.
export type LessonPlanSegment =
  | "FUNDAMENTAL"
  | "MEDIO"
  | "FACULDADE"
  | "INFOPRODUTOR";

export interface LessonPlanGenerationConfig {
  segment: LessonPlanSegment;
  /** Tema/título da aula. */
  title: string;
  /** Disciplina / área. */
  subject: string;
  /** Ano, série ou período (ex: "7º ano", "3º semestre"). */
  level: string;
  /** Duração da aula em minutos. */
  durationMinutes: number;
  language: OutputLanguage;
}

// Código BNCC sugerido pela IA. No MVP `bnccVerified` é sempre false — a base
// determinística de validação entra numa onda 2 (decisão travada: "decidir
// depois"). A UI mostra badge "sugerido pela IA — confira".
export interface BnccSkill {
  code: string; // ex: EF67LP08
  description: string;
}

// O plano gerado, em blocos. A matriz de quais blocos cada segmento preenche
// está no brief seção 4 — aqui todos os campos existem no shape, mas os não
// aplicáveis vêm vazios (ex: bnccSkills=[] para Faculdade/Infoprodutor).
export interface GeneratedLessonPlan {
  objectives: string[];
  bnccSkills: BnccSkill[];
  /** Apenas K-12 traz códigos; sempre não-verificado no MVP. */
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

// Blocos regeneráveis individualmente no canvas. bnccSkills fica de fora —
// é derivado (sugerido junto com o conteúdo), não um bloco editável avulso.
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

// Blocos que são listas (string[]) e não texto corrido.
export const ARRAY_BLOCK_KEYS: ReadonlyArray<LessonPlanBlockKey> = [
  "objectives",
  "resources",
  "bibliography",
];

export interface LessonPlanGenerationResult {
  plan: GeneratedLessonPlan;
  /**
   * Disciplina/área e nível efetivos. Quando o professor não os informa, a IA
   * os infere a partir do material; quando informa, ecoam o valor dado. O front
   * usa isso pra preencher a identificação do plano salvo.
   */
  subject: string;
  level: string;
  usage: GenerationUsage;
}

export interface RegenerateBlockResult {
  /** Apenas a chave regenerada, com o novo valor. */
  block: Partial<GeneratedLessonPlan>;
  usage: GenerationUsage;
}

// Interface — implementada por OpenAi (infra). Os use cases dependem desta.
export interface LessonPlanGenerator {
  generate(input: {
    config: LessonPlanGenerationConfig;
    sources: ExtractionResult[];
  }): Promise<LessonPlanGenerationResult>;

  // Regenera UM bloco, mantendo os outros no prompt como contexto pra
  // coerência. Devolve só o bloco regenerado.
  regenerateBlock(input: {
    config: LessonPlanGenerationConfig;
    currentPlan: GeneratedLessonPlan;
    blockKey: LessonPlanBlockKey;
    sources: ExtractionResult[];
  }): Promise<RegenerateBlockResult>;
}
