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
  /** Política do campo `context`. */
  contextPolicy: "none" | "required";
  /** Instrução específica do estilo — voz, tom, estrutura. */
  guide: string;
  /** Regra de distratores específica. */
  distractorPattern: string;
  /** Regra de explanation específica. */
  explanationPattern: string;
}
