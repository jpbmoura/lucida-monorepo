import type {
  ImageProvider,
  ImageResult,
  ImageSearchOptions,
} from "../../domain/image-provider.js";

// Resposta parcial da Pexels Search API (só o que usamos).
interface PexelsPhoto {
  src: {
    landscape?: string;
    large2x?: string;
    large?: string;
    medium?: string;
    small?: string;
    tiny?: string;
  };
  photographer: string;
  photographer_url: string;
  url: string;
  width: number;
  height: number;
}
interface PexelsSearchResponse {
  photos?: PexelsPhoto[];
}

const PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search";
const TIMEOUT_MS = 8_000;
const CACHE_MAX = 500;

// Provider Pexels atrás da interface ImageProvider. Cacheia resultados por
// query+orientação na memória do processo (Pexels: 200 req/h, 20k/mês —
// suficiente, mas evita gastar à toa em regenerações). NÃO baixa o binário: a
// URL vai pro slide pra hotlink no preview; o export (PPTX/PDF) baixa e embute
// na hora.
export class PexelsImageProvider implements ImageProvider {
  private readonly cache = new Map<string, ImageResult[]>();

  constructor(private readonly apiKey: string) {}

  async search(
    query: string,
    options?: ImageSearchOptions,
  ): Promise<ImageResult[]> {
    const q = query.trim();
    if (!q) return [];
    const orientation = options?.orientation ?? "landscape";
    const perPage = Math.min(Math.max(options?.perPage ?? 1, 1), 15);
    const cacheKey = `${orientation}:${perPage}:${q.toLowerCase()}`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const url = new URL(PEXELS_SEARCH_URL);
    url.searchParams.set("query", q);
    url.searchParams.set("orientation", orientation);
    url.searchParams.set("per_page", String(perPage));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { Authorization: this.apiKey },
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error("[ai-ops] Pexels respondeu não-OK", res.status);
        return [];
      }
      const body = (await res.json()) as PexelsSearchResponse;
      const results = (body.photos ?? []).map(toResult);
      this.remember(cacheKey, results);
      return results;
    } catch (err) {
      const e = err as { name?: string; message?: string };
      console.error("[ai-ops] Pexels falhou", { name: e.name, message: e.message });
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  private remember(key: string, results: ImageResult[]): void {
    // Evicção simples FIFO quando estoura o teto.
    if (this.cache.size >= CACHE_MAX) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, results);
  }
}

function toResult(photo: PexelsPhoto): ImageResult {
  const src = photo.src;
  return {
    url: src.landscape ?? src.large2x ?? src.large ?? src.medium ?? src.tiny ?? "",
    thumbUrl: src.medium ?? src.small ?? src.tiny ?? src.large ?? "",
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    sourceUrl: photo.url,
    width: photo.width,
    height: photo.height,
  };
}
