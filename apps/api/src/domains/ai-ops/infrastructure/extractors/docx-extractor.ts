import mammoth from "mammoth";
import type { FileExtractor, SourceFile } from "../../domain/generation-types.js";
import { FileExtractionFailedError } from "../../domain/errors.js";

export class DocxExtractor implements FileExtractor {
  supports(mimetype: string, filename: string): boolean {
    if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return true;
    }
    return filename.toLowerCase().endsWith(".docx");
  }

  async extract(file: SourceFile): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value.trim();
    } catch (err) {
      throw new FileExtractionFailedError(
        `Falha ao extrair texto do DOCX ${file.filename}: ${(err as Error).message}`,
      );
    }
  }
}
