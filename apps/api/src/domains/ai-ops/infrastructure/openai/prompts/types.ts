import type { ExamStyle } from "../../../domain/generation-types.js";

// Cada estilo declara essas chaves. O `index.ts` compõe shared + spec-specifics.
export interface StyleSpec {
  key: ExamStyle;
  /** Nome amigável em pt-BR pra referência (não vai pro prompt). */
  label: string;
  /** Alvo do estilo (ex: "prova ENEM", "sala de aula"). */
  target: string;
  /** Quantidade de opções pra múltipla escolha neste estilo. */
  optionCount: number;
  /**
   * Temperatura da chamada à IA neste estilo. Baixa em estilos sensíveis a
   * correção (simple/analytical — cálculo, raciocínio); mais alta onde a
   * variedade de cenário importa (contextual/reflective). Ver R1 / baseline
   * do harness em docs/audits/ai-ops-prompt-pipeline.md.
   */
  temperature: number;
  /** Política do campo `context`. */
  contextPolicy: "none" | "required";
  /** Instrução específica do estilo — voz, tom, estrutura. */
  guide: string;
  /** Regra de distratores específica. */
  distractorPattern: string;
  /** Regra de explanation específica. */
  explanationPattern: string;
}
