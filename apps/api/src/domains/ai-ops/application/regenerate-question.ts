import type {
  FileExtractor,
  GeneratedQuestion,
  GenerationConfig,
  GenerationUsage,
  QuestionGenerator,
  SourceFile,
} from "../domain/generation-types.js";
import type { TranscriptFetcher } from "../infrastructure/extractors/youtube-transcript-fetcher.js";
import type { BillingService } from "@/domains/billing/application/billing-service.js";
import { estimateCreditsBeforeGeneration } from "../infrastructure/estimate-credits.js";
import { collectSources } from "./collect-sources.js";
import { AiGenerationFailedError } from "../domain/errors.js";

interface Input {
  ownerId: string;
  /**
   * Org ativa na sessão. Se presente + modo pool, débito sai da wallet
   * da org. Null pra professor avulso.
   */
  activeOrganizationId: string | null;
  /** User humano realmente logado (≠ ownerId em modo impersonate). */
  actorRealUserId?: string;
  config: Omit<GenerationConfig, "questionCount">;
  files: SourceFile[];
  pastedText: string;
  youtubeUrls: string[];
  avoidStatements: string[];
}

interface Output {
  question: GeneratedQuestion;
  usage: GenerationUsage;
}

// Gera 1 questão substituta, passando as existentes como "evite" pro prompt.
// Força questionCount = 1 e repassa o resto da config (style, tipos, dificuldade).
export class RegenerateQuestionUseCase {
  constructor(
    private readonly extractors: FileExtractor[],
    private readonly transcriptFetcher: TranscriptFetcher,
    private readonly generator: QuestionGenerator,
    private readonly billing: BillingService,
  ) {}

  async execute(input: Input): Promise<Output> {
    const sources = await collectSources(
      {
        files: input.files,
        pastedText: input.pastedText,
        youtubeUrls: input.youtubeUrls,
      },
      { extractors: this.extractors, transcriptFetcher: this.transcriptFetcher },
    );

    // Pré-check com margem. Regenerar 1 questão é barato mas ainda custa.
    // Usa o mesmo formato de material do generator pra estimativa bater.
    const material = sources
      .map((s) => `### ${s.sourceLabel}\n${s.text}`)
      .join("\n\n");
    const estimate = estimateCreditsBeforeGeneration({
      config: { ...input.config, questionCount: 1 },
      material,
      avoidStatements: input.avoidStatements,
    });
    await this.billing.ensureSufficientBalance({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      estimate,
    });

    const result = await this.generator.generate({
      config: { ...input.config, questionCount: 1 },
      sources,
      avoidStatements: input.avoidStatements,
    });

    const question = result.questions[0];
    if (!question) {
      throw new AiGenerationFailedError("A IA não devolveu nenhuma questão.");
    }

    const isImpersonating =
      !!input.actorRealUserId && input.actorRealUserId !== input.ownerId;
    await this.billing.debit({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      amount: result.usage.credits,
      reason: "ai_consumption",
      relatedAction: "regenerate_question",
      tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
      ...(isImpersonating && {
        metadata: { impersonatedBy: input.actorRealUserId },
      }),
    });

    return { question, usage: result.usage };
  }
}
