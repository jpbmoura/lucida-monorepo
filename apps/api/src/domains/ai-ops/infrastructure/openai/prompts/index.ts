import type {
  ExamStyle,
  GenerationConfig,
} from "../../../domain/generation-types.js";
import type { StyleSpec } from "./types.js";
import { PERSONA } from "./shared/persona.js";
import { GOLDEN_RULES } from "./shared/golden-rules.js";
import { BLOOM_CALIBRATION } from "./shared/bloom-calibration.js";
import { DISTRACTOR_DISCIPLINE_BASE } from "./shared/distractor-discipline.js";
import { buildOutputContract } from "./shared/output-contract.js";
import { simpleStyle } from "./styles/simple.js";
import { contextualStyle } from "./styles/contextual.js";
import { analyticalStyle } from "./styles/analytical.js";
import { reflectiveStyle } from "./styles/reflective.js";

const STYLES: Record<ExamStyle, StyleSpec> = {
  simple: simpleStyle,
  contextual: contextualStyle,
  analytical: analyticalStyle,
  reflective: reflectiveStyle,
};

export function getStyleSpec(style: ExamStyle): StyleSpec {
  return STYLES[style];
}

export function buildSystemPrompt(style: ExamStyle): string {
  const spec = STYLES[style];
  return [
    PERSONA,
    GOLDEN_RULES,
    BLOOM_CALIBRATION,
    spec.guide,
    DISTRACTOR_DISCIPLINE_BASE,
    spec.distractorPattern,
    spec.explanationPattern,
    buildOutputContract(spec),
  ].join("\n\n");
}

export function buildUserPrompt(input: {
  config: GenerationConfig;
  material: string;
  avoidStatements?: string[];
}): string {
  const { config, material, avoidStatements } = input;
  const spec = STYLES[config.style];
  const typesLabel = typesToLabel(config.questionTypes, spec.optionCount);
  const difficulty = difficultyToLabel(config.difficulty);

  const avoidBlock =
    avoidStatements && avoidStatements.length > 0
      ? `\n\nIMPORTANTE — evite gerar questões parecidas com as que já existem
na prova. Gere algo sobre OUTRO conceito ou aborde o mesmo conceito sob um
ângulo diferente. Questões existentes:
${avoidStatements.map((s, i) => `${i + 1}. ${truncate(s, 200)}`).join("\n")}`
      : "";

  return `Gere ${config.questionCount} ${config.questionCount === 1 ? "questão" : "questões"} a partir do material abaixo.

Tipos permitidos: ${typesLabel}
Dificuldade pedida: ${difficulty}${avoidBlock}

--- MATERIAL DE APOIO ---
${material}
--- FIM DO MATERIAL ---

Distribua os tipos quando mais de um for permitido. Varie o enunciado e os
conceitos cobertos entre as questões. Nenhuma questão deve ser redundante
com outra.`;
}

function typesToLabel(
  types: GenerationConfig["questionTypes"],
  optionCount: number,
): string {
  const labels: string[] = [];
  if (types.multipleChoice) {
    labels.push(`multipleChoice (múltipla escolha, ${optionCount} opções)`);
  }
  if (types.trueFalse) labels.push("trueFalse (verdadeiro/falso)");
  return labels.length > 0
    ? labels.join(" e ")
    : `multipleChoice (múltipla escolha, ${optionCount} opções)`;
}

function difficultyToLabel(d: GenerationConfig["difficulty"]): string {
  switch (d) {
    case "fácil":
      return "todas fáceis (nível lembrar/entender)";
    case "médio":
      return "todas médias (nível aplicar/analisar)";
    case "difícil":
      return "todas difíceis (nível avaliar/criar)";
    case "misto":
      return "mista (distribua entre fácil, médio e difícil — pelo menos uma de cada se questionCount ≥ 3)";
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
