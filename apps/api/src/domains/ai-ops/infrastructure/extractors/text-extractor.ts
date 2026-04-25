import type { FileExtractor, SourceFile } from "../../domain/generation-types.js";
import { FileExtractionFailedError } from "../../domain/errors.js";

export class TextExtractor implements FileExtractor {
  supports(mimetype: string, filename: string): boolean {
    if (mimetype.startsWith("text/")) return true;
    const lower = filename.toLowerCase();
    return lower.endsWith(".txt") || lower.endsWith(".md");
  }

  async extract(file: SourceFile): Promise<string> {
    try {
      return file.buffer.toString("utf-8").trim();
    } catch (err) {
      throw new FileExtractionFailedError(
        `Falha ao ler ${file.filename}: ${(err as Error).message}`,
      );
    }
  }
}
