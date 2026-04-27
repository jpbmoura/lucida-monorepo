import type {
  FileExtractor,
  GenerationConfig,
  SourceFile,
} from "../domain/generation-types.js";
import type { TranscriptFetcher } from "../infrastructure/extractors/youtube-transcript-fetcher.js";
import { estimateCreditsBeforeGeneration } from "../infrastructure/estimate-credits.js";
import { collectSources } from "./collect-sources.js";

interface Input {
  config: GenerationConfig;
  files: SourceFile[];
  pastedText: string;
  youtubeUrls: string[];
}

export interface EstimateResult {
  /** Soma de chars do material extraído (PDF + DOCX + TXT + colado + YouTube). */
  materialChars: number;
  /** Créditos estimados pela mesma fórmula do débito real pós-geração. */
  estimatedCredits: number;
}

/**
 * Pré-extrai o material e devolve a mesma estimativa que o pre-check do
 * generate roda internamente. Existe pra o frontend mostrar um número
 * confiável no confirm dialog em vez de chutar a partir do tamanho dos
 * arquivos crus (PDFs comprimidos têm 100-300x mais bytes do que texto).
 *
 * Não chama OpenAI nem debita — é um GET semântico, custo só de extração.
 */
export class EstimateExamGenerationUseCase {
  constructor(
    private readonly extractors: FileExtractor[],
    private readonly transcriptFetcher: TranscriptFetcher,
  ) {}

  async execute(input: Input): Promise<EstimateResult> {
    const sources = await collectSources(
      {
        files: input.files,
        pastedText: input.pastedText,
        youtubeUrls: input.youtubeUrls,
      },
      {
        extractors: this.extractors,
        transcriptFetcher: this.transcriptFetcher,
      },
    );

    // Mesmo formato que o generator usa — `### label\n text\n\n…` — pra a
    // estimativa de tokens bater com o que vai pra IA.
    const material = sources
      .map((s) => `### ${s.sourceLabel}\n${s.text}`)
      .join("\n\n");

    const estimatedCredits = estimateCreditsBeforeGeneration({
      config: input.config,
      material,
    });

    return {
      materialChars: material.length,
      estimatedCredits,
    };
  }
}
