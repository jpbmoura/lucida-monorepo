import { randomBytes } from "node:crypto";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { env } from "@/env.js";
import { AiGenerationFailedError } from "../../domain/errors.js";
import type {
  GradeAnswerRequest,
  GradeAnswerResult,
  OpenAnswerGrader,
  RubricCriterionForGrading,
} from "../../domain/grading-types.js";
import {
  buildGradingSystemPrompt,
  buildGradingUserPrompt,
} from "./prompts/grading/system.js";

/**
 * Corrige uma resposta discursiva contra a rubrica via OpenAI Structured Outputs.
 *
 * O schema strict restringe `criterionId`/`levelId` aos ids reais da rubrica —
 * o modelo não consegue inventar um nível. A nota não vem do modelo: ele só
 * escolhe o nível; os pontos são resolvidos pelo use case a partir da rubrica.
 */
export class OpenAiAnswerGrader implements OpenAnswerGrader {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 4,
      timeout: 120_000,
    });
  }

  async grade(req: GradeAnswerRequest): Promise<GradeAnswerResult> {
    const criterionIds = req.criteria.map((c) => c.id);
    const levelIds = Array.from(
      new Set(req.criteria.flatMap((c) => c.levels.map((l) => l.id))),
    );
    if (criterionIds.length === 0 || levelIds.length === 0) {
      throw new AiGenerationFailedError("Rubrica sem critérios/níveis para corrigir.");
    }

    const schema = z.object({
      criteria: z.array(
        z.object({
          criterionId: z.enum(criterionIds as [string, ...string[]]),
          levelId: z.enum(levelIds as [string, ...string[]]),
          justification: z.string(),
          feedback: z.string(),
        }),
      ),
    });

    const nonce = randomBytes(8).toString("hex");
    const systemPrompt = buildGradingSystemPrompt();
    const userPrompt = buildGradingUserPrompt(req, nonce);

    let rawContent: string | null = null;
    let inputTokens = 0;
    let outputTokens = 0;
    try {
      const completion = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL,
        temperature: 0.1,
        max_tokens: Math.min(4000, req.criteria.length * 220 + 400),
        response_format: zodResponseFormat(schema, "answer_grading"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      const message = completion.choices[0]?.message;
      if (!message) throw new AiGenerationFailedError("Correção veio vazia.");
      if (message.refusal) {
        throw new AiGenerationFailedError(
          `IA recusou corrigir esta resposta: ${message.refusal}`,
        );
      }
      rawContent = message.content;
      inputTokens = completion.usage?.prompt_tokens ?? 0;
      outputTokens = completion.usage?.completion_tokens ?? 0;
    } catch (err) {
      if (err instanceof AiGenerationFailedError) throw err;
      throw new AiGenerationFailedError((err as Error).message);
    }

    if (!rawContent) throw new AiGenerationFailedError("Correção veio vazia.");
    let parsed: z.infer<typeof schema>;
    try {
      parsed = schema.parse(JSON.parse(rawContent));
    } catch {
      throw new AiGenerationFailedError("Saída da correção fora do contrato.");
    }

    // Garante 1 decisão por critério, com levelId válido para AQUELE critério
    // (se o modelo trocar um levelId entre critérios, corrige aqui).
    const byCriterion = new Map(parsed.criteria.map((c) => [c.criterionId, c]));
    const criteria = req.criteria.map((rc) => {
      const got = byCriterion.get(rc.id);
      const valid = !!got && rc.levels.some((l) => l.id === got.levelId);
      return {
        criterionId: rc.id,
        levelId: valid ? got!.levelId : lowestLevelId(rc),
        justification: got?.justification?.trim() ?? "",
        feedback: got?.feedback?.trim() ?? "",
      };
    });

    return { criteria, model: env.OPENAI_MODEL, inputTokens, outputTokens };
  }
}

function lowestLevelId(c: RubricCriterionForGrading): string {
  const sorted = [...c.levels].sort((a, b) => a.points - b.points);
  return sorted[0]?.id ?? c.levels[0]?.id ?? "";
}
