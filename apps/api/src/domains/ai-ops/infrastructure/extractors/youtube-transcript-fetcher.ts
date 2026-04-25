// Import direto do build ESM: o pacote tem "type: module" no package.json mas
// aponta `main` pra um arquivo CJS-syntax (malformado). Node falha no named
// import padrão. Apontar pro ESM build resolve sem precisar patch.
import { YoutubeTranscript } from "youtube-transcript/dist/youtube-transcript.esm.js";
import { FileExtractionFailedError } from "../../domain/errors.js";

export interface TranscriptFetcher {
  fetch(url: string): Promise<{ text: string; label: string }>;
}

// Usa youtube-transcript (scraping das legendas). Pode falhar se o vídeo
// não tem legendas públicas ou se o YouTube mudou o HTML. Nesse caso
// lançamos um erro claro pro usuário.
export class YoutubeTranscriptFetcher implements TranscriptFetcher {
  async fetch(url: string): Promise<{ text: string; label: string }> {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(url, {
        lang: "pt",
      }).catch(async () => {
        // Fallback: se não tem legendas em pt, tenta sem filtro.
        return YoutubeTranscript.fetchTranscript(url);
      });

      if (!transcript || transcript.length === 0) {
        throw new FileExtractionFailedError(
          `Não encontramos legendas no vídeo ${url}. Só dá pra usar vídeos com legendas disponíveis.`,
        );
      }

      const text = transcript.map((item) => item.text).join(" ").trim();
      return { text, label: `YouTube: ${url}` };
    } catch (err) {
      if (err instanceof FileExtractionFailedError) throw err;
      throw new FileExtractionFailedError(
        `Falha ao buscar transcrição de ${url}: ${(err as Error).message}`,
      );
    }
  }
}
