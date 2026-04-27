import { RoadmapItemId } from "./roadmap-id.js";
import {
  ROADMAP_MODERATION_STATUSES,
  ROADMAP_PRODUCTS,
  ROADMAP_SOURCES,
  ROADMAP_STAGES,
  type RoadmapModerationStatus,
  type RoadmapProduct,
  type RoadmapSource,
  type RoadmapStage,
} from "./roadmap-types.js";
import {
  RoadmapDescriptionInvalidError,
  RoadmapStaffNoteInvalidError,
  RoadmapTitleInvalidError,
} from "./roadmap-errors.js";

const TITLE_MIN = 4;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 1000;
const STAFF_NOTE_MAX = 500;

export interface RoadmapItemProps {
  id: RoadmapItemId;
  title: string;
  description: string;
  product: RoadmapProduct;
  stage: RoadmapStage;
  source: RoadmapSource;
  /** Contador denormalizado de votos. Atualizado junto com inserts/deletes
   * na collection de votos — votos são a fonte de verdade. */
  votes: number;
  moderationStatus: RoadmapModerationStatus;
  /** Pode ser null pra itens criados direto pelo staff (não há autor). */
  createdBy: string | null;
  /** Comentário público do staff (visível pra todos quando preenchido).
   * Usado principalmente em `declined` pra explicar o motivo. */
  staffNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class RoadmapItem {
  private constructor(private props: RoadmapItemProps) {}

  static create(input: {
    id: RoadmapItemId;
    title: string;
    description?: string;
    product: RoadmapProduct;
    stage: RoadmapStage;
    source: RoadmapSource;
    moderationStatus?: RoadmapModerationStatus;
    createdBy: string | null;
    staffNote?: string | null;
    now?: Date;
  }): RoadmapItem {
    if (!ROADMAP_PRODUCTS.includes(input.product)) {
      throw new Error(`Produto inválido: ${input.product}`);
    }
    if (!ROADMAP_STAGES.includes(input.stage)) {
      throw new Error(`Estágio inválido: ${input.stage}`);
    }
    if (!ROADMAP_SOURCES.includes(input.source)) {
      throw new Error(`Origem inválida: ${input.source}`);
    }
    const moderationStatus = input.moderationStatus ?? "auto_approved";
    if (!ROADMAP_MODERATION_STATUSES.includes(moderationStatus)) {
      throw new Error(
        `Estado de moderação inválido: ${moderationStatus}`,
      );
    }
    const now = input.now ?? new Date();
    return new RoadmapItem({
      id: input.id,
      title: validateTitle(input.title),
      description: validateDescription(input.description ?? ""),
      product: input.product,
      stage: input.stage,
      source: input.source,
      votes: 0,
      moderationStatus,
      createdBy: input.createdBy,
      staffNote: validateStaffNote(input.staffNote ?? null),
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: RoadmapItemProps): RoadmapItem {
    return new RoadmapItem({ ...props });
  }

  get id(): RoadmapItemId {
    return this.props.id;
  }
  get title(): string {
    return this.props.title;
  }
  get description(): string {
    return this.props.description;
  }
  get product(): RoadmapProduct {
    return this.props.product;
  }
  get stage(): RoadmapStage {
    return this.props.stage;
  }
  get source(): RoadmapSource {
    return this.props.source;
  }
  get votes(): number {
    return this.props.votes;
  }
  get moderationStatus(): RoadmapModerationStatus {
    return this.props.moderationStatus;
  }
  get createdBy(): string | null {
    return this.props.createdBy;
  }
  get staffNote(): string | null {
    return this.props.staffNote;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  rename(value: string, now: Date = new Date()): void {
    this.props.title = validateTitle(value);
    this.props.updatedAt = now;
  }

  updateDescription(value: string, now: Date = new Date()): void {
    this.props.description = validateDescription(value);
    this.props.updatedAt = now;
  }

  changeProduct(value: RoadmapProduct, now: Date = new Date()): void {
    if (!ROADMAP_PRODUCTS.includes(value)) {
      throw new Error(`Produto inválido: ${value}`);
    }
    this.props.product = value;
    this.props.updatedAt = now;
  }

  changeStage(value: RoadmapStage, now: Date = new Date()): void {
    if (!ROADMAP_STAGES.includes(value)) {
      throw new Error(`Estágio inválido: ${value}`);
    }
    this.props.stage = value;
    this.props.updatedAt = now;
  }

  setStaffNote(value: string | null, now: Date = new Date()): void {
    this.props.staffNote = validateStaffNote(value);
    this.props.updatedAt = now;
  }
}

function validateTitle(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length < TITLE_MIN) {
    throw new RoadmapTitleInvalidError(
      `Título precisa ter ao menos ${TITLE_MIN} caracteres.`,
    );
  }
  if (trimmed.length > TITLE_MAX) {
    throw new RoadmapTitleInvalidError(
      `Título não pode passar de ${TITLE_MAX} caracteres.`,
    );
  }
  return trimmed;
}

function validateDescription(value: string): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length > DESCRIPTION_MAX) {
    throw new RoadmapDescriptionInvalidError(
      `Descrição não pode passar de ${DESCRIPTION_MAX} caracteres.`,
    );
  }
  return trimmed;
}

function validateStaffNote(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > STAFF_NOTE_MAX) {
    throw new RoadmapStaffNoteInvalidError(
      `Comentário do staff não pode passar de ${STAFF_NOTE_MAX} caracteres.`,
    );
  }
  return trimmed;
}
