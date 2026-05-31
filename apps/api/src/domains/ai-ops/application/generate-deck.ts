import type {
  ExtractionResult,
  FileExtractor,
  SourceFile,
} from "../domain/generation-types.js";
import type { ImageProvider } from "../domain/image-provider.js";
import type {
  SlideDeckGenerationConfig,
  SlideDeckGenerationResult,
  SlideDeckGenerator,
  SlideGenerationProgress,
} from "../domain/slide-generation-types.js";
import type { TranscriptFetcher } from "../infrastructure/extractors/youtube-transcript-fetcher.js";
import type { BillingService } from "@/domains/billing/application/billing-service.js";
import { priceDeck } from "../domain/slide-pricing.js";
import { collectSources } from "./collect-sources.js";
import { resolveSlideImages } from "./resolve-slide-images.js";
import { splitOverflowingSlides } from "./split-overflowing-slides.js";

interface Input {
  ownerId: string;
  /** Org ativa na sessão. Null pra professor avulso. */
  activeOrganizationId: string | null;
  /** User humano logado (≠ ownerId em impersonate) — vira audit trail. */
  actorRealUserId?: string;
  config: SlideDeckGenerationConfig;
  files: SourceFile[];
  pastedText: string;
  youtubeUrls: string[];
  onProgress?: (p: SlideGenerationProgress) => void;
}

// Gera um deck de slides a partir de material cru OU de um plano de aula
// (renderizado pra texto pelo controller e passado como pastedText). Espelha
// GenerateLessonPlanUseCase: material obrigatório, preço tabelado, débito
// atômico ao final. Resolve imagens (Pexels) depois da geração — degradação
// graciosa quando não há provedor.
export class GenerateDeckUseCase {
  constructor(
    private readonly extractors: FileExtractor[],
    private readonly transcriptFetcher: TranscriptFetcher,
    private readonly generator: SlideDeckGenerator,
    private readonly billing: BillingService,
    private readonly imageProvider: ImageProvider,
  ) {}

  async execute(input: Input): Promise<SlideDeckGenerationResult> {
    const sources: ExtractionResult[] = await collectSources(
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
    );

    // Preço tabelado exato (fonte + nº de slides) — mesmo número da cotação.
    const price = priceDeck(input.config);
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

    // Divide slides densos demais em continuações (mantém a fonte legível); o
    // auto-fit no front é a garantia dura final contra overflow.
    result.slides = splitOverflowingSlides(result.slides);

    // Resolve imagens (Pexels) — best-effort; sem provedor/resultado, o slide
    // fica com url null e o front cai pra tipografia.
    result.slides = await resolveSlideImages(result.slides, this.imageProvider);

    const isImpersonating =
      !!input.actorRealUserId && input.actorRealUserId !== input.ownerId;
    await this.billing.debit({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      amount: price,
      reason: "ai_consumption",
      relatedAction: "generate_slide_deck",
      tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
      metadata: {
        source: input.config.source,
        slideCount: input.config.slideCount,
        ...(isImpersonating && { impersonatedBy: input.actorRealUserId }),
      },
    });

    // Front exibe usage.credits pós-geração — força bater com o cobrado.
    result.usage.credits = price;
    return result;
  }
}
