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
import { priceRegenerate } from "../domain/exam-pricing.js";
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

    // Preço tabelado exato de 1 questão (sem a base — prompt reaproveitado).
    // Sem margem: a cobrança é exata.
    const price = priceRegenerate(input.config);
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
      throw new AiGenerationFailedError("A IA não devolveu nenhuma questão.");
    }

    // Débito do preço tabelado. `tokensUsed` é só telemetria do custo real.
    const isImpersonating =
      !!input.actorRealUserId && input.actorRealUserId !== input.ownerId;
    await this.billing.debit({
      userId: input.ownerId,
      activeOrganizationId: input.activeOrganizationId,
      amount: price,
      reason: "ai_consumption",
      relatedAction: "regenerate_question",
      tokensUsed: result.usage.inputTokens + result.usage.outputTokens,
      ...(isImpersonating && {
        metadata: { impersonatedBy: input.actorRealUserId },
      }),
    });

    // Front acumula `usage.credits` no badge — força bater com o cobrado.
    result.usage.credits = price;
    return { question, usage: result.usage };
  }
}
