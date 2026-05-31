import type { SlideDeckRepository } from "../domain/slide-deck-repository.js";
import {
  SlideDeck,
  type SlideDeckSource,
  type SlideDeckUsage,
  type SlideTheme,
  type SlideTone,
} from "../domain/slide-deck.js";
import type { Slide } from "../domain/slide.js";

export interface CreateSlideDeckInput {
  ownerId: string;
  organizationId?: string | null;
  courseId?: string | null;
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
  theme: SlideTheme;
  source: SlideDeckSource;
  slides: Slide[];
  usage?: SlideDeckUsage | null;
}

export interface CreateSlideDeckOutput {
  id: string;
}

// Salva o deck no finalizar do wizard (geração é em memória; persistência é
// desacoplada — espelha CreateLessonPlanUseCase).
export class CreateSlideDeckUseCase {
  constructor(private readonly decks: SlideDeckRepository) {}

  async execute(input: CreateSlideDeckInput): Promise<CreateSlideDeckOutput> {
    const deck = SlideDeck.create({
      id: this.decks.nextId(),
      ownerId: input.ownerId,
      organizationId: input.organizationId ?? null,
      courseId: input.courseId ?? null,
      title: input.title,
      subject: input.subject,
      gradeLevel: input.gradeLevel,
      tone: input.tone,
      theme: input.theme,
      source: input.source,
      slides: input.slides,
      status: "READY",
      usage: input.usage ?? null,
    });
    await this.decks.save(deck);
    return { id: deck.id.toString() };
  }
}
