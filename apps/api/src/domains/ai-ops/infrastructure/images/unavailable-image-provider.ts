import type {
  ImageProvider,
  ImageResult,
} from "../../domain/image-provider.js";

// Provider no-op usado quando não há PEXELS_API_KEY. Devolve [] sempre — os
// slides caem pra tipografia/tema (degradação graciosa). Mesmo padrão do
// UnavailableOmrClient do scan.
export class UnavailableImageProvider implements ImageProvider {
  async search(): Promise<ImageResult[]> {
    return [];
  }
}
