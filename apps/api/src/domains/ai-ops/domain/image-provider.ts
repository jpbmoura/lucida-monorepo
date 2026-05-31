// Interface de domínio pra busca de imagens de stock. Implementada por Pexels
// na infraestrutura (pexels.client.ts). Os use cases dependem desta abstração —
// trocar de provedor não toca em application/domain. Sem provedor configurado
// (sem PEXELS_API_KEY), uma implementação no-op devolve [] e os slides caem pra
// tipografia (degradação graciosa).

export type ImageOrientation = "landscape" | "portrait" | "square";

export interface ImageSearchOptions {
  orientation?: ImageOrientation;
  perPage?: number;
}

export interface ImageResult {
  /** URL da imagem (CDN do provedor) — usada no preview e baixada no export. */
  url: string;
  /** Miniatura, pra grids/preview leve. */
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
  /** Página de origem (atribuição). */
  sourceUrl: string;
  width: number;
  height: number;
}

export interface ImageProvider {
  /** Busca imagens pra uma query. Devolve [] quando não há provedor/resultados. */
  search(query: string, options?: ImageSearchOptions): Promise<ImageResult[]>;
}
