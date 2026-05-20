// R2 (telemetria) — verificador de coerência explicação ↔ gabarito.
//
// Auditoria R2: a explicação às vezes justifica uma alternativa diferente
// da marcada como correta (ou o raciocínio não fecha). Detectar isso é
// semântico — heurística não distingue se a prosa sustenta B ou C, então
// usamos uma chamada batched de LLM. v1 é SÓ TELEMETRIA: não altera a
// prova, não bloqueia o fluxo, não debita o professor. Serve pra medir a
// taxa real em produção antes de decidir UI/auto-fix (v2).
//
// Escopo deliberado: COERÊNCIA (a explicação bate com a alternativa
// marcada?), não CORREÇÃO aritmética (isso é R1, depende de modelo mais
// forte). Mesmo o modelo default consegue julgar coerência interna com
// confiança razoável; correção de cálculo é outro problema.

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { env } from "@/env.js";
import type {
  GeneratedQuestion,
  GenerationConfig,
} from "../../domain/generation-types.js";

/** Default = modelo de geração; sobrescreve sem decisão de modelo no código. */
const VERIFIER_MODEL = process.env.R2_VERIFIER_MODEL ?? env.OPENAI_MODEL;

const verdictSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      explanationMatchesMarked: z.boolean(),
      reason: z.string(),
    }),
  ),
});

export interface CoherenceVerdict {
  index: number;
  explanationMatchesMarked: boolean;
  reason: string;
}

export interface VerificationOutcome {
  verdicts: CoherenceVerdict[];
  model: string;
  inputTokens: number;
  outputTokens: number;
}

const SYSTEM = `Você audita coerência interna de questões de prova. Para cada
questão recebe: enunciado, contexto, alternativas, o ÍNDICE da alternativa
marcada como correta e a explicação dada.

Julgue UMA coisa por questão:
- explanationMatchesMarked: a explicação justifica EXATAMENTE a alternativa
  marcada (não outra), e o raciocínio dela é internamente consistente com
  essa escolha? Não avalie se o gabarito está aritmeticamente certo — só se
  a explicação e a alternativa marcada estão alinhadas entre si.
- reason: 1 frase curta. Se incoerente, diga qual alternativa a explicação
  realmente sustenta.

Responda só o JSON do schema, um item por questão, na ordem recebida.`;

function buildUserPrompt(
  config: GenerationConfig,
  questions: GeneratedQuestion[],
): string {
  const blocks = questions.map((q, i) => {
    const opts = q.options
      .map((o, j) => `  [${j}] ${String.fromCharCode(65 + j)}) ${o}`)
      .join("\n");
    return `--- QUESTÃO ${i} ---
${q.context ? `Contexto: ${q.context}\n` : ""}Enunciado: ${q.statement}
Alternativas:
${opts}
Marcada como correta: índice ${q.correctAnswer} (${String.fromCharCode(65 + q.correctAnswer)})
Explicação: ${q.explanation || "(vazia)"}`;
  });
  return `Estilo ${config.style}. Audite as ${questions.length} questões:

${blocks.join("\n\n")}`;
}

export class AnswerExplanationVerifier {
  private readonly client: OpenAI;
  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  /** Liga só com R2_VERIFY=1 — quem chama checa antes (telemetria opt-in). */
  static enabled(): boolean {
    return process.env.R2_VERIFY === "1";
  }

  async verify(
    config: GenerationConfig,
    questions: GeneratedQuestion[],
  ): Promise<VerificationOutcome> {
    if (questions.length === 0) {
      return { verdicts: [], model: VERIFIER_MODEL, inputTokens: 0, outputTokens: 0 };
    }
    const completion = await this.client.chat.completions.create({
      model: VERIFIER_MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildUserPrompt(config, questions) },
      ],
      response_format: zodResponseFormat(verdictSchema, "coherence"),
      temperature: 0,
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = verdictSchema.parse(JSON.parse(raw));
    return {
      verdicts: parsed.results,
      model: VERIFIER_MODEL,
      inputTokens: completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
    };
  }
}
