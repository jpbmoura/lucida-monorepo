import { SlideDeckId } from "./slide-deck-id.js";
import {
  SlideDeckEmptyError,
  SlideDeckTitleInvalidError,
  SlideNotFoundError,
} from "./slide-deck-errors.js";
import type { Slide } from "./slide.js";

const TITLE_MIN = 2;
const TITLE_MAX = 200;

// Os 5 temas (bundles de design tokens no front). O domínio só guarda o id
// escolhido — a aparência mora 100% no frontend. Conteúdo × aparência são
// desacoplados: trocar de tema não toca nos slides.
export type SlideTheme = "papel" | "minimo" | "lousa" | "ludico" | "vivido";

// Registro didático: tom da escrita dos slides.
export type SlideTone = "didatico" | "descontraido" | "formal" | "inspirador";

export type SlideDeckStatus = "DRAFT" | "READY" | "ERROR";

// De onde o deck nasceu. `ref` aponta pro id do plano (quando lesson-plan); pra
// material cru fica null (o material é insumo efêmero, não é referenciável).
export type SlideDeckSourceType = "lesson-plan" | "material";

export interface SlideDeckSource {
  type: SlideDeckSourceType;
  ref: string | null;
}

export interface SlideDeckUsage {
  inputTokens: number;
  outputTokens: number;
  /** Créditos efetivamente cobrados (espelha lesson-plan/exam). */
  credits: number;
}

export interface SlideDeckProps {
  id: SlideDeckId;
  ownerId: string;
  organizationId: string | null;
  /** Curso opcional ao qual o deck pertence (como faz o Exam). */
  courseId: string | null;
  title: string;
  subject: string;
  gradeLevel: string;
  tone: SlideTone;
  theme: SlideTheme;
  source: SlideDeckSource;
  slides: Slide[];
  status: SlideDeckStatus;
  usage: SlideDeckUsage | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SlideDeck {
  private constructor(private props: SlideDeckProps) {}

  static create(input: {
    id: SlideDeckId;
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
    status?: SlideDeckStatus;
    usage?: SlideDeckUsage | null;
    now?: Date;
  }): SlideDeck {
    const now = input.now ?? new Date();
    if (input.slides.length === 0) throw new SlideDeckEmptyError();
    return new SlideDeck({
      id: input.id,
      ownerId: input.ownerId,
      organizationId: input.organizationId ?? null,
      courseId: input.courseId ?? null,
      title: validateTitle(input.title),
      subject: input.subject,
      gradeLevel: input.gradeLevel,
      tone: input.tone,
      theme: input.theme,
      source: input.source,
      slides: input.slides,
      status: input.status ?? "READY",
      usage: input.usage ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: SlideDeckProps): SlideDeck {
    return new SlideDeck({ ...props });
  }

  get id(): SlideDeckId {
    return this.props.id;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get organizationId(): string | null {
    return this.props.organizationId;
  }
  get courseId(): string | null {
    return this.props.courseId;
  }
  get title(): string {
    return this.props.title;
  }
  get subject(): string {
    return this.props.subject;
  }
  get gradeLevel(): string {
    return this.props.gradeLevel;
  }
  get tone(): SlideTone {
    return this.props.tone;
  }
  get theme(): SlideTheme {
    return this.props.theme;
  }
  get source(): SlideDeckSource {
    return { ...this.props.source };
  }
  get slides(): Slide[] {
    return this.props.slides.map((s) => ({ ...s }));
  }
  get status(): SlideDeckStatus {
    return this.props.status;
  }
  get usage(): SlideDeckUsage | null {
    return this.props.usage;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateMeta(
    next: Partial<
      Pick<
        SlideDeckProps,
        "title" | "subject" | "gradeLevel" | "tone" | "theme" | "courseId"
      >
    >,
    now: Date = new Date(),
  ): void {
    if (next.title !== undefined) this.props.title = validateTitle(next.title);
    if (next.subject !== undefined) this.props.subject = next.subject;
    if (next.gradeLevel !== undefined) this.props.gradeLevel = next.gradeLevel;
    if (next.tone !== undefined) this.props.tone = next.tone;
    if (next.theme !== undefined) this.props.theme = next.theme;
    if (next.courseId !== undefined) this.props.courseId = next.courseId;
    this.props.updatedAt = now;
  }

  replaceSlides(slides: Slide[], now: Date = new Date()): void {
    if (slides.length === 0) throw new SlideDeckEmptyError();
    this.props.slides = slides;
    this.props.updatedAt = now;
  }

  // Reordena os slides por uma lista de ids. Lança se algum id não existir ou
  // se faltar/sobrar id (a nova ordem precisa ser uma permutação exata).
  reorderSlides(orderedIds: string[], now: Date = new Date()): void {
    const byId = new Map(this.props.slides.map((s) => [s.id, s]));
    if (orderedIds.length !== byId.size) throw new SlideNotFoundError();
    const next: Slide[] = [];
    for (const id of orderedIds) {
      const slide = byId.get(id);
      if (!slide) throw new SlideNotFoundError();
      next.push(slide);
    }
    this.props.slides = next;
    this.props.updatedAt = now;
  }

  replaceSlide(slideId: string, slide: Slide, now: Date = new Date()): void {
    const idx = this.props.slides.findIndex((s) => s.id === slideId);
    if (idx === -1) throw new SlideNotFoundError();
    this.props.slides[idx] = { ...slide, id: slideId };
    this.props.updatedAt = now;
  }

  setStatus(status: SlideDeckStatus, now: Date = new Date()): void {
    this.props.status = status;
    this.props.updatedAt = now;
  }

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }
}

function validateTitle(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < TITLE_MIN) {
    throw new SlideDeckTitleInvalidError(
      `Título precisa ter ao menos ${TITLE_MIN} caracteres.`,
    );
  }
  if (trimmed.length > TITLE_MAX) {
    throw new SlideDeckTitleInvalidError(
      `Título não pode passar de ${TITLE_MAX} caracteres.`,
    );
  }
  return trimmed;
}
