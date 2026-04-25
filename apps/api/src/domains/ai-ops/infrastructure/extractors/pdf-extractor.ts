import { PDFParse } from "pdf-parse";
import type { FileExtractor, SourceFile } from "../../domain/generation-types.js";
import { FileExtractionFailedError } from "../../domain/errors.js";

export class PdfExtractor implements FileExtractor {
  supports(mimetype: string, filename: string): boolean {
    return mimetype === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  }

  async extract(file: SourceFile): Promise<string> {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const result = await parser.getText();
      return result.text.trim();
    } catch (err) {
      throw new FileExtractionFailedError(
        `Falha ao extrair texto do PDF ${file.filename}: ${(err as Error).message}`,
      );
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
}
