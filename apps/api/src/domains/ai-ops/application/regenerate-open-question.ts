import type {
  FileExtractor,
  SourceFile,
} from "../domain/generation-types.js";
import type {
  GeneratedOpenQuestion,
  OpenGenerationConfig,
  OpenQuestionGenerator,
} from "../domain/open-generation-types.js";
import type { TranscriptFetcher } from "../infrastructure/extractors/youtube-transcript-fetcher.js";
import type { BillingService } from "@/domains/billing/application/billing-service.js";
import { priceRegenerateOpen } from "../domain/exam-pricing.js";
import { AiGenerationFailedError } from "../domain/errors.js";
import { collectSources } from "./collect-sources.js";

interface Input {
  ownerId: string;
  activeOrganizationId: string | null;
  actorRealUserId?: string;
  config: OpenGenerationConfig;
  files: SourceFile[];
  pastedText: string;
  youtubeUrls: string[];
  /** Enunciados já existentes na prova — evita repetição. */
  avoidStatements: string[];
}

export interface RegenerateOpenQuestionResult {
  question: GeneratedOpenQuestion;
  usage: { inputTokens: number; outputTokens: number; credits: number };
}

/** Regera UMA questão discursiva + rubrica, evitando os enunciados existentes. */
export class RegenerateOpenQuestionUseCase {
  constructor(
    private readonly extractors: FileExtractor[],
    private readonly transcriptFetcher: TranscriptFetcher,
    private readonly generator: OpenQuestionGenerator,
    private readonly billing: BillingService,
  ) {}

  async execute(input: Input): Promise<RegenerateOpenQuestionResult> {
    const sources = await collectSources(
      {
        files: input.files,
        pastedText: input.pastedText,
        youtubeUrls: input.youtubeUrls,
      },
      { extractors: this.extractors, transcriptFetcher: this.transcriptFetcher },
    );

    const price = priceRegenerateOpen();
    await this.billing.ensureSufficientBalance({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      estimate: price,
    });

    const result = await this.generator.generate({
      config: { ...input.config, questionCount: 1 },
      sources,
      avoidStatements: input.avoidStatements,
    });

    const question = result.questions[0];
    if (!question) {
      throw new AiGenerationFailedError("Não foi possível regerar a questão.");
    }

    const isImpersonating =
      !!input.actorRealUserId && input.actorRealUserId !== input.ownerId;
    await this.billing.debit({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      amount: price,
      reason: "ai_consumption",
      relatedAction: "regenerate_open_question",
      tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
      metadata: {
        kind: "open",
        ...(isImpersonating && { impersonatedBy: input.actorRealUserId }),
      },
    });

    return {
      question,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        credits: price,
      },
    };
  }
}
