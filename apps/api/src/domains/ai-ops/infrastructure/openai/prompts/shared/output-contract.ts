import type { OutputLanguage } from "../../../../domain/generation-types.js";
import type { StyleSpec } from "../types.js";
import { outputLanguageLine, trueFalseLabels } from "./language.js";

export function buildOutputContract(
  spec: StyleSpec,
  language: OutputLanguage,
): string {
  const mcCount = spec.optionCount;
  const [trueLabel, falseLabel] = trueFalseLabels(language);
  const contextField =
    spec.contextPolicy === "required"
      ? `"context" é OBRIGATÓRIO (veja a seção ESTILO deste prompt).`
      : `"context" DEVE SER string vazia "" (este estilo não usa contexto).`;

  return `Retorne JSON no formato EXATO:
{
  "questions": [
    {
      "type": "multipleChoice" | "trueFalse",
      "statement": "enunciado da questão",
      "context": "contexto quando aplicável, senão string vazia",
      "options": ["opção 1", "opção 2", ...],
      "correctAnswer": 0,
      "explanation": "por que a correta é correta",
      "difficulty": "fácil" | "médio" | "difícil"
    }
  ]
}

Regras do formato:
- "correctAnswer" é o ÍNDICE (0-based) da opção correta em "options".
- Para "multipleChoice", gere EXATAMENTE ${mcCount} opções. Uma única correta.
- Para "trueFalse", "options" deve ser EXATAMENTE ["${trueLabel}", "${falseLabel}"].
- ${contextField}
- Nada de comentários, markdown ou texto fora do JSON.
- ${outputLanguageLine(language)}`;
}
