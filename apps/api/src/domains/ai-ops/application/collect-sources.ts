import {
  EmptySourceMaterialError,
  UnsupportedFileTypeError,
} from "../domain/errors.js";
import type {
  ExtractionResult,
  FileExtractor,
  SourceFile,
} from "../domain/generation-types.js";
import type { TranscriptFetcher } from "../infrastructure/extractors/youtube-transcript-fetcher.js";

interface Input {
  files: SourceFile[];
  pastedText: string;
  youtubeUrls: string[];
}

interface Deps {
  extractors: FileExtractor[];
  transcriptFetcher: TranscriptFetcher;
}

// Coleta e normaliza todas as fontes (PDF/DOCX/TXT + texto colado + YouTube)
// num array único de ExtractionResult. Compartilhado por Generate e Regenerate.
export async function collectSources(
  input: Input,
  deps: Deps,
): Promise<ExtractionResult[]> {
  const sources: ExtractionResult[] = [];

  for (const file of input.files) {
    const extractor = deps.extractors.find((e) =>
      e.supports(file.mimetype, file.filename),
    );
    if (!extractor) {
      throw new UnsupportedFileTypeError(
        `Tipo de arquivo não suportado: ${file.filename} (${file.mimetype}). Aceitamos PDF, DOCX e TXT.`,
      );
    }
    const text = await extractor.extract(file);
    if (text.length > 0) {
      sources.push({ text, sourceLabel: file.filename });
    }
  }

  const pasted = input.pastedText?.trim() ?? "";
  if (pasted.length > 0) {
    sources.push({ text: pasted, sourceLabel: "Texto colado" });
  }

  for (const url of input.youtubeUrls) {
    const trimmed = url.trim();
    if (!trimmed) continue;
    const transcript = await deps.transcriptFetcher.fetch(trimmed);
    if (transcript.text.length > 0) {
      sources.push({ text: transcript.text, sourceLabel: transcript.label });
    }
  }

  if (sources.length === 0) {
    throw new EmptySourceMaterialError();
  }

  return sources;
}
