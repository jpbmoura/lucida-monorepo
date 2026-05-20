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
import { estimateCreditsBeforeGeneration } from "../infrastructure/estimate-credits.js";
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

    // Pré-check com margem de segurança (SAFETY_MARGIN lá dentro). Bloqueia
    // com 402 se o saldo não cobre um possível estouro do output da IA.
    // O material precisa do mesmo formato que o generator usa (### label\n
    // text\n\n…) pra a estimativa de tokens bater com o que vai pra IA.
    const material = sources
      .map((s) => `### ${s.sourceLabel}\n${s.text}`)
      .join("\n\n");
    const estimate = estimateCreditsBeforeGeneration({
      config: input.config,
      material,
    });
    await this.billing.ensureSufficientBalance({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      estimate,
    });

    const result = await this.generator.generate({
      config: input.config,
      sources,
      onProgress: input.onProgress,
    });

    // Débito real pós-geração — usa os tokens de fato consumidos.
    const isImpersonating =
      !!input.actorRealUserId && input.actorRealUserId !== input.ownerId;
    await this.billing.debit({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      amount: result.usage.credits,
      reason: "ai_consumption",
      relatedAction: "generate_exam",
      tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
      metadata: {
        questionCount: input.config.questionCount,
        style: input.config.style,
        ...(isImpersonating && { impersonatedBy: input.actorRealUserId }),
      },
    });

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
