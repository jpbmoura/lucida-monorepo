import type {
  SlideDeck,
  SlideDeckSource,
  SlideDeckStatus,
  SlideTheme,
  SlideTone,
} from "../domain/slide-deck.js";
import type { Slide } from "../domain/slide.js";

export interface SlideDeckDTO {
  id: string;
  ownerId: string;
  organizationId: string | null;
  courseId: string | null;
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
  theme: SlideTheme;
  source: SlideDeckSource;
  slides: Slide[];
  status: SlideDeckStatus;
  usage: { inputTokens: number; outputTokens: number; credits: number } | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toSlideDeckDTO(deck: SlideDeck): SlideDeckDTO {
  return {
    id: deck.id.toString(),
    ownerId: deck.ownerId,
    organizationId: deck.organizationId,
    courseId: deck.courseId,
    title: deck.title,
    subject: deck.subject,
    gradeLevel: deck.gradeLevel,
    tone: deck.tone,
    theme: deck.theme,
    source: deck.source,
    slides: deck.slides,
    status: deck.status,
    usage: deck.usage,
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt,
  };
}
