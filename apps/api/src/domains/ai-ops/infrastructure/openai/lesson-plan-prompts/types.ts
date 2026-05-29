import type { LessonPlanSegment } from "../../../domain/lesson-plan-generation-types.js";

// Cada segmento declara essas chaves. O `index.ts` compõe os blocos shared +
// os specifics deste spec. É o que materializa "4 templates separados, não 1
// com switch" (brief seção 8) — cada segmento mora num arquivo próprio.
export interface SegmentSpec {
  key: LessonPlanSegment;
  /** Nome amigável em pt-BR (não vai pro prompt). */
  label: string;
  /** Como a IA deve se referir ao artefato (ex: "plano de aula", "roteiro"). */
  artifactName: string;
  /** Política do bloco de habilidades BNCC. */
  bnccPolicy: "required" | "none";
  /** Política do bloco de bibliografia. */
  bibliographyPolicy: "required" | "optional" | "none";
  /**
   * Temperatura da chamada. Mais baixa onde precisão/alinhamento curricular
   * importam (K-12 com BNCC); mais alta onde criatividade de roteiro pesa
   * (Infoprodutor).
   */
  temperature: number;
  /**
   * Instrução específica do segmento — vocabulário, estrutura dos blocos,
   * tom. É o coração do template; o resto (persona, fronteira de confiança,
   * contrato de saída) é compartilhado.
   */
  guide: string;
}
