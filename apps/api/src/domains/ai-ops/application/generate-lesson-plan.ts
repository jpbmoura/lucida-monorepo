import type {
  ExtractionResult,
  FileExtractor,
  SourceFile,
} from "../domain/generation-types.js";
import type {
  LessonPlanGenerationConfig,
  LessonPlanGenerationResult,
  LessonPlanGenerator,
} from "../domain/lesson-plan-generation-types.js";
import type { TranscriptFetcher } from "../infrastructure/extractors/youtube-transcript-fetcher.js";
import type { BillingService } from "@/domains/billing/application/billing-service.js";
import { priceLessonPlan } from "../domain/lesson-plan-pricing.js";
import { collectSources } from "./collect-sources.js";

interface Input {
  ownerId: string;
  /** Org ativa na sessão. Null pra professor avulso. */
  activeOrganizationId: string | null;
  /** User humano logado (≠ ownerId em impersonate) — vira audit trail. */
  actorRealUserId?: string;
  config: LessonPlanGenerationConfig;
  files: SourceFile[];
  pastedText: string;
  youtubeUrls: string[];
}

// Gera o rascunho de um plano de aula. Diferente das provas, o material é
// OPCIONAL — o professor pode planejar só a partir do tema/nível/duração.
export class GenerateLessonPlanUseCase {
  constructor(
    private readonly extractors: FileExtractor[],
    private readonly transcriptFetcher: TranscriptFetcher,
    private readonly generator: LessonPlanGenerator,
    private readonly billing: BillingService,
  ) {}

  async execute(input: Input): Promise<LessonPlanGenerationResult> {
    // Material OBRIGATÓRIO: collectSources lança EmptySourceMaterialError se
    // não houver arquivo, texto ou vídeo, e InsufficientSourceMaterialError se
    // o conteúdo for raso demais. O plano sempre parte do conteúdo do professor.
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
      { artifactLabel: "um plano de aula fiel" },
    );

    // Preço tabelado exato (por segmento) — mesmo número da cotação.
    const price = priceLessonPlan(input.config);
    await this.billing.ensureSufficientBalance({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      estimate: price,
    });

    const result = await this.generator.generate({
      config: input.config,
      sources,
    });

    const isImpersonating =
      !!input.actorRealUserId && input.actorRealUserId !== input.ownerId;
    await this.billing.debit({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      amount: price,
      reason: "ai_consumption",
      relatedAction: "generate_lesson_plan",
      tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
      metadata: {
        segment: input.config.segment,
        ...(isImpersonating && { impersonatedBy: input.actorRealUserId }),
      },
    });

    // Front exibe usage.credits pós-geração — força bater com o cobrado.
    result.usage.credits = price;
    return result;
  }
}
