import type {
  ExtractionResult,
  FileExtractor,
  SourceFile,
} from "../domain/generation-types.js";
import type { ImageProvider } from "../domain/image-provider.js";
import type {
  GeneratedSlide,
  RegenerateSlideResult,
  SlideDeckGenerationConfig,
  SlideDeckGenerator,
} from "../domain/slide-generation-types.js";
import type { TranscriptFetcher } from "../infrastructure/extractors/youtube-transcript-fetcher.js";
import type { BillingService } from "@/domains/billing/application/billing-service.js";
import { priceRegenerateSlide } from "../domain/slide-pricing.js";
import { collectSources } from "./collect-sources.js";
import { resolveSlideImages } from "./resolve-slide-images.js";

interface Input {
  ownerId: string;
  activeOrganizationId: string | null;
  actorRealUserId?: string;
  config: SlideDeckGenerationConfig;
  /** Deck atual (todos os slides) — contexto pro arco. */
  currentSlides: GeneratedSlide[];
  /** Slide a regenerar. */
  slideId: string;
  /** Material — OPCIONAL na regeneração (o contexto vem dos slides atuais). */
  files: SourceFile[];
  pastedText: string;
  youtubeUrls: string[];
}

// Regenera UM slide do deck. Custo marginal (priceRegenerateSlide), débito
// atômico. Espelha RegenerateLessonBlockUseCase: material opcional.
export class RegenerateSlideUseCase {
  constructor(
    private readonly extractors: FileExtractor[],
    private readonly transcriptFetcher: TranscriptFetcher,
    private readonly generator: SlideDeckGenerator,
    private readonly billing: BillingService,
    private readonly imageProvider: ImageProvider,
  ) {}

  async execute(input: Input): Promise<RegenerateSlideResult> {
    const hasMaterial =
      input.files.length > 0 ||
      input.pastedText.trim().length > 0 ||
      input.youtubeUrls.length > 0;
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
          { artifactLabel: "uma apresentação fiel" },
        )
      : [];

    const price = priceRegenerateSlide();
    await this.billing.ensureSufficientBalance({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      estimate: price,
    });

    const result = await this.generator.regenerateSlide({
      config: input.config,
      currentSlides: input.currentSlides,
      slideId: input.slideId,
      sources,
    });

    const [withImage] = await resolveSlideImages(
      [result.slide],
      this.imageProvider,
    );
    result.slide = withImage ?? result.slide;

    const isImpersonating =
      !!input.actorRealUserId && input.actorRealUserId !== input.ownerId;
    await this.billing.debit({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      amount: price,
      reason: "ai_consumption",
      relatedAction: "regenerate_slide_deck",
      tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
      metadata: {
        source: input.config.source,
        ...(isImpersonating && { impersonatedBy: input.actorRealUserId }),
      },
    });

    result.usage.credits = price;
    return result;
  }
}
