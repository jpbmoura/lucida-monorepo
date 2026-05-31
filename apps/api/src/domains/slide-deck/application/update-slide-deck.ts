import { SlideDeckId } from "../domain/slide-deck-id.js";
import { SlideDeckNotFoundError } from "../domain/slide-deck-errors.js";
import type { SlideDeckRepository } from "../domain/slide-deck-repository.js";
import type { SlideTheme, SlideTone } from "../domain/slide-deck.js";
import type { Slide } from "../domain/slide.js";

interface Input {
  id: string;
  ownerId: string;
  title?: string;
  subject?: string;
  gradeLevel?: string;
  tone?: SlideTone;
  theme?: SlideTheme;
  courseId?: string | null;
  /** Substitui a lista inteira de slides (edição in-place, add/remover, imagem). */
  slides?: Slide[];
}

// Atualiza metadados e/ou os slides do deck. A reordenação pura tem seu próprio
// use case (reorder-slides); aqui slides substitui a lista toda quando enviada.
export class UpdateSlideDeckUseCase {
  constructor(private readonly decks: SlideDeckRepository) {}

  async execute(input: Input): Promise<void> {
    const deck = await this.decks.findById(SlideDeckId.of(input.id));
    if (!deck || !deck.isOwnedBy(input.ownerId)) {
      throw new SlideDeckNotFoundError();
    }

    const meta: Parameters<typeof deck.updateMeta>[0] = {};
    if (input.title !== undefined) meta.title = input.title;
    if (input.subject !== undefined) meta.subject = input.subject;
    if (input.gradeLevel !== undefined) meta.gradeLevel = input.gradeLevel;
    if (input.tone !== undefined) meta.tone = input.tone;
    if (input.theme !== undefined) meta.theme = input.theme;
    if (input.courseId !== undefined) meta.courseId = input.courseId;
    if (Object.keys(meta).length > 0) deck.updateMeta(meta);

    if (input.slides !== undefined) deck.replaceSlides(input.slides);

    await this.decks.save(deck);
  }
}
