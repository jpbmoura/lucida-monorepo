import type {
  ExtractionResult,
  FileExtractor,
  SourceFile,
} from "../domain/generation-types.js";
import type {
  GeneratedLessonPlan,
  LessonPlanBlockKey,
  LessonPlanGenerationConfig,
  RegenerateBlockResult,
  LessonPlanGenerator,
} from "../domain/lesson-plan-generation-types.js";
import type { TranscriptFetcher } from "../infrastructure/extractors/youtube-transcript-fetcher.js";
import type { BillingService } from "@/domains/billing/application/billing-service.js";
import { priceRegenerateBlock } from "../domain/lesson-plan-pricing.js";
import { collectSources } from "./collect-sources.js";

interface Input {
  ownerId: string;
  activeOrganizationId: string | null;
  actorRealUserId?: string;
  config: LessonPlanGenerationConfig;
  currentPlan: GeneratedLessonPlan;
  blockKey: LessonPlanBlockKey;
  files: SourceFile[];
  pastedText: string;
  youtubeUrls: string[];
}

// Regenera UM bloco do plano, mantendo os demais como contexto. Cobra o preço
// marginal de um bloco (sem a base da geração inteira).
export class RegenerateLessonBlockUseCase {
  constructor(
    private readonly extractors: FileExtractor[],
    private readonly transcriptFetcher: TranscriptFetcher,
    private readonly generator: LessonPlanGenerator,
    private readonly billing: BillingService,
  ) {}

  async execute(input: Input): Promise<RegenerateBlockResult> {
    const hasMaterial =
      input.files.length > 0 ||
      input.pastedText.trim().length > 0 ||
      input.youtubeUrls.some((u) => u.trim().length > 0);

    const sources: ExtractionResult[] = hasMaterial
      ? await collectSources(
          {
            files: input.files,
            pastedText: input.pastedText,
            youtubeUrls: input.youtubeUrls,
          },
          {
            extractors: this.extractors,
            transcriptFetcher: this.transcriptFetcher,
          },
          { artifactLabel: "um plano de aula fiel" },
        )
      : [];

    const price = priceRegenerateBlock();
    await this.billing.ensureSufficientBalance({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      estimate: price,
    });

    const result = await this.generator.regenerateBlock({
      config: input.config,
      currentPlan: input.currentPlan,
      blockKey: input.blockKey,
      sources,
    });

    const isImpersonating =
      !!input.actorRealUserId && input.actorRealUserId !== input.ownerId;
    await this.billing.debit({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      amount: price,
      reason: "ai_consumption",
      relatedAction: "regenerate_lesson_block",
      tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
      metadata: {
        segment: input.config.segment,
        blockKey: input.blockKey,
        ...(isImpersonating && { impersonatedBy: input.actorRealUserId }),
      },
    });

    result.usage.credits = price;
    return result;
  }
}
