import type {
  FileExtractor,
  GenerationProgress,
  SourceFile,
} from "../domain/generation-types.js";
import type {
  OpenGenerationConfig,
  OpenGenerationResult,
  OpenQuestionGenerator,
} from "../domain/open-generation-types.js";
import type { TranscriptFetcher } from "../infrastructure/extractors/youtube-transcript-fetcher.js";
import type { BillingService } from "@/domains/billing/application/billing-service.js";
import { priceOpenExam } from "../domain/exam-pricing.js";
import { collectSources } from "./collect-sources.js";

interface Input {
  ownerId: string;
  activeOrganizationId: string | null;
  actorRealUserId?: string;
  config: OpenGenerationConfig;
  files: SourceFile[];
  pastedText: string;
  youtubeUrls: string[];
  onProgress?: (p: GenerationProgress) => void;
}

/**
 * Geração de prova DISCURSIVA por IA: extrai o material, cota o preço tabelado
 * (base + por questão discursiva), bloqueia sem saldo, gera enunciado + rubrica
 * e debita o valor exato. Caminho separado do gerador objetivo.
 */
export class GenerateOpenQuestionsUseCase {
  constructor(
    private readonly extractors: FileExtractor[],
    private readonly transcriptFetcher: TranscriptFetcher,
    private readonly generator: OpenQuestionGenerator,
    private readonly billing: BillingService,
  ) {}

  async execute(input: Input): Promise<OpenGenerationResult> {
    const sources = await collectSources(
      {
        files: input.files,
        pastedText: input.pastedText,
        youtubeUrls: input.youtubeUrls,
      },
      { extractors: this.extractors, transcriptFetcher: this.transcriptFetcher },
    );

    const price = priceOpenExam(input.config.questionCount);
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

    const isImpersonating =
      !!input.actorRealUserId && input.actorRealUserId !== input.ownerId;
    await this.billing.debit({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      amount: price,
      reason: "ai_consumption",
      relatedAction: "generate_open_exam",
      tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
      metadata: {
        questionCount: input.config.questionCount,
        kind: "open",
        ...(isImpersonating && { impersonatedBy: input.actorRealUserId }),
      },
    });

    result.usage.credits = price;
    return result;
  }
}
