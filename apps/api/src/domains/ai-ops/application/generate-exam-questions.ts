import type {
  FileExtractor,
  GenerationConfig,
  GenerationProgress,
  GenerationResult,
  QuestionGenerator,
  SourceFile,
} from "../domain/generation-types.js";
import type { TranscriptFetcher } from "../infrastructure/extractors/youtube-transcript-fetcher.js";
import type { BillingService } from "@/domains/billing/application/billing-service.js";
import { priceExam } from "../domain/exam-pricing.js";
import { AnswerExplanationVerifier } from "../infrastructure/openai/answer-explanation-verifier.js";
import { collectSources } from "./collect-sources.js";

interface Input {
  ownerId: string;
  /**
   * Org ativa na sessão. Se presente + modo pool, o débito sai da wallet
   * da org em vez da pessoal. Null pra professor avulso.
   */
  activeOrganizationId: string | null;
  /**
   * User humano realmente logado. Em impersonate, é o owner; em modo
   * normal, igual ao ownerId. Quando diferente, anexamos `impersonatedBy`
   * no metadata do ledger pra audit trail.
   */
  actorRealUserId?: string;
  config: GenerationConfig;
  files: SourceFile[];
  pastedText: string;
  youtubeUrls: string[];
  /** Progresso por rodada do top-up — repassado pro stream SSE. */
  onProgress?: (p: GenerationProgress) => void;
}

export class GenerateExamQuestionsUseCase {
  constructor(
    private readonly extractors: FileExtractor[],
    private readonly transcriptFetcher: TranscriptFetcher,
    private readonly generator: QuestionGenerator,
    private readonly billing: BillingService,
    // R2 telemetria — opcional. Só roda se injetado E R2_VERIFY=1.
    private readonly answerVerifier?: AnswerExplanationVerifier,
  ) {}

  async execute(input: Input): Promise<GenerationResult> {
    const sources = await collectSources(
      {
        files: input.files,
        pastedText: input.pastedText,
        youtubeUrls: input.youtubeUrls,
      },
      { extractors: this.extractors, transcriptFetcher: this.transcriptFetcher },
    );

    // Preço tabelado exato (estilo + nº de questões). É o mesmo número que o
    // confirm dialog mostrou via /v1/ai/estimate. Bloqueia com 402 se o saldo
    // não cobre — sem margem, porque a cobrança é exata.
    const price = priceExam(input.config);
    await this.billing.ensureSufficientBalance({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      estimate: price,
    });

    const result = await this.generator.generate({
      config: input.config,
      sources,
      onProgress: input.onProgress,
    });

    // Débito do preço tabelado — exatamente o valor informado na cotação.
    // `tokensUsed` guarda o custo real (telemetria), mas não influencia o
    // valor cobrado.
    const isImpersonating =
      !!input.actorRealUserId && input.actorRealUserId !== input.ownerId;
    await this.billing.debit({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      amount: price,
      reason: "ai_consumption",
      relatedAction: "generate_exam",
      tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
      metadata: {
        questionCount: input.config.questionCount,
        style: input.config.style,
        ...(isImpersonating && { impersonatedBy: input.actorRealUserId }),
      },
    });

    // O front exibe `usage.credits` pós-geração — força bater com o cobrado.
    result.usage.credits = price;

    // R2 (telemetria, opt-in via R2_VERIFY=1) — mede coerência
    // explicação↔gabarito em produção. Best-effort: NUNCA quebra a geração
    // nem debita o professor (instrumentação interna; a plataforma arca o
    // custo da chamada). Síncrono de propósito: gated default-off, então
    // zero impacto no caminho normal.
    if (this.answerVerifier && AnswerExplanationVerifier.enabled()) {
      try {
        const v = await this.answerVerifier.verify(
          input.config,
          result.questions,
        );
        const incoherent = v.verdicts.filter(
          (r) => !r.explanationMatchesMarked,
        );
        console.log(
          "[ai-ops][r2-verify]",
          JSON.stringify({
            style: input.config.style,
            total: result.questions.length,
            incoherent: incoherent.length,
            rate:
              result.questions.length > 0
                ? +(incoherent.length / result.questions.length).toFixed(3)
                : 0,
            model: v.model,
            verifierTokens: v.inputTokens + v.outputTokens,
            details: incoherent.map((r) => ({
              index: r.index,
              reason: r.reason,
            })),
          }),
        );
      } catch (err) {
        console.warn(
          "[ai-ops][r2-verify] verificação falhou (ignorado):",
          (err as Error).message,
        );
      }
    }

    return result;
  }
}
