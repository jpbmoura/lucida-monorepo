import {
  EmptySourceMaterialError,
  InsufficientSourceMaterialError,
  UnsupportedFileTypeError,
} from "../domain/errors.js";

// Abaixo disso a IA só alucina — material curto demais pra uma prova
// fiel. ~150 chars ≈ uma frase e meia; menos que isso não dá pra cobrir
// nem uma questão sem inventar. PDF escaneado sem OCR cai aqui.
const MIN_MEANINGFUL_CHARS = 150;
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

  // R8 — extraiu algo, mas pouco demais. Caso clássico: PDF escaneado
  // (imagem, sem camada de texto) → vem só ruído/whitespace. Sem isso o
  // pipeline gera questões alucinadas sem avisar. Mensagem acionável,
  // específica se houve arquivo.
  const meaningfulChars = sources.reduce(
    (sum, s) => sum + s.text.trim().length,
    0,
  );
  if (meaningfulChars < MIN_MEANINGFUL_CHARS) {
    const hadFiles = input.files.length > 0;
    throw new InsufficientSourceMaterialError(
      hadFiles
        ? "Quase nenhum texto foi extraído do material. Se o arquivo for um PDF escaneado (imagem), ele não tem texto selecionável — envie um PDF com texto, um DOCX, ou cole o conteúdo direto."
        : "O material enviado é curto demais para gerar uma prova fiel. Adicione mais conteúdo (pelo menos um parágrafo).",
    );
  }

  return sources;
}
