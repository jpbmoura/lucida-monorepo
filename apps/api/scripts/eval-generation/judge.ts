// LLM-as-judge — opt-in (--judge ou EVAL_JUDGE=1). Custa tokens, então
// não roda por padrão. Usa um modelo FORTE (default gpt-4o, configurável
// por OPENAI_JUDGE_MODEL) — o juiz precisa ser mais confiável que o gerador
// (que roda gpt-4o-mini por default). É isto que mede R1/R2: o gabarito
// está de fato certo? a explicação bate? está ancorado no material?

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { env } from "../../src/env.js";
import type {
  GeneratedQuestion,
  GenerationConfig,
} from "../../src/domains/ai-ops/domain/generation-types.js";

export const JUDGE_MODEL = process.env.OPENAI_JUDGE_MODEL ?? "gpt-4o";

const verdictSchema = z.object({
  answerCorrect: z.boolean(),
  groundedInMaterial: z.boolean(),
  explanationConsistent: z.boolean(),
  difficultyMatch: z.boolean(),
  notes: z.string(),
});

export type Verdict = z.infer<typeof verdictSchema> & { questionIndex: number };

const SYSTEM = `Você é um avaliador rigoroso de questões de prova. Recebe o
material-fonte, uma questão gerada por IA, a alternativa marcada como correta
e a explicação. Sua tarefa é JULGAR com honestidade brutal — você não escreve
questões, só audita. Resolva a questão você mesmo antes de julgar.

Critérios (cada um true/false):
- answerCorrect: a alternativa marcada é DE FATO a resposta correta? Resolva
  o problema do zero. Se for cálculo, calcule. Se mais de uma alternativa
  estiver correta ou nenhuma estiver, é false.
- groundedInMaterial: a questão é respondível a partir do material (ou de
  conhecimento canônico da área que o material pressupõe) sem inventar fatos
  que contradizem o material? false se alucinou.
- explanationConsistent: a explicação justifica a alternativa MARCADA (não
  outra) e o raciocínio está correto?
- difficultyMatch: a exigência cognitiva bate com a dificuldade pedida?
- notes: 1 frase curta dizendo o problema principal, ou "ok".

Responda só o JSON do schema.`;

function buildUserPrompt(
  material: string,
  config: GenerationConfig,
  q: GeneratedQuestion,
): string {
  const opts = q.options
    .map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`)
    .join("\n");
  const correct = String.fromCharCode(65 + q.correctAnswer);
  return `MATERIAL:
${material.slice(0, 6000)}

DIFICULDADE PEDIDA: ${config.difficulty}
ESTILO: ${config.style}

QUESTÃO:
${q.context ? `Contexto: ${q.context}\n` : ""}Enunciado: ${q.statement}
${opts}
Marcada como correta: ${correct}
Explicação dada: ${q.explanation}`;
}

export class Judge {
  private readonly client: OpenAI;
  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  async judge(
    material: string,
    config: GenerationConfig,
    questions: GeneratedQuestion[],
  ): Promise<Verdict[]> {
    const verdicts: Verdict[] = [];
    // Sequencial de propósito — barato em paralelismo, evita rate limit e
    // mantém o relatório determinístico na ordem das questões.
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      try {
        const completion = await this.client.chat.completions.create({
          model: JUDGE_MODEL,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: buildUserPrompt(material, config, q) },
          ],
          response_format: zodResponseFormat(verdictSchema, "verdict"),
          temperature: 0,
        });
        const raw = completion.choices[0]?.message?.content;
        const parsed = verdictSchema.parse(JSON.parse(raw ?? "{}"));
        verdicts.push({ ...parsed, questionIndex: i });
      } catch (err) {
        verdicts.push({
          answerCorrect: false,
          groundedInMaterial: false,
          explanationConsistent: false,
          difficultyMatch: false,
          notes: `juiz falhou: ${(err as Error).message}`,
          questionIndex: i,
        });
      }
    }
    return verdicts;
  }
}
