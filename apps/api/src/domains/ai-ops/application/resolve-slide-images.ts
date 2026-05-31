import type { ImageProvider } from "../domain/image-provider.js";
import type { GeneratedSlide } from "../domain/slide-generation-types.js";

// Resolve as imagens dos slides que pediram (image.required) via o ImageProvider
// (Pexels). Best-effort: qualquer falha/ausência de resultado deixa a imagem
// com url null e o front cai pra tipografia. Resolve em paralelo — um deck tem
// poucos slides com imagem, bem dentro do rate limit do Pexels.
export async function resolveSlideImages(
  slides: GeneratedSlide[],
  provider: ImageProvider,
): Promise<GeneratedSlide[]> {
  return Promise.all(
    slides.map(async (slide) => {
      const image = slide.image;
      if (!image || !image.required || !image.query || image.url) return slide;
      try {
        const results = await provider.search(image.query, {
          orientation: "landscape",
          perPage: 1,
        });
        const hit = results[0];
        if (!hit) return slide;
        return {
          ...slide,
          image: {
            ...image,
            url: hit.url,
            thumbUrl: hit.thumbUrl,
            photographer: hit.photographer,
            photographerUrl: hit.photographerUrl,
            sourceUrl: hit.sourceUrl,
          },
        };
      } catch {
        return slide;
      }
    }),
  );
}
