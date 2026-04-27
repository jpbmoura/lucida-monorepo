import { CardId } from "./card-id.js";
import type { CardStatus } from "./card-status.js";
import type { CardPriority } from "./card-priority.js";
import type { CardTagId } from "./card-tag.js";
import { isCardTagId } from "./card-tag.js";
import { InvalidCardInputError } from "./kanban-errors.js";

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5_000;

export interface CardProps {
  id: CardId;
  title: string;
  description: string;
  status: CardStatus;
  priority: CardPriority;
  /** UserId (BetterAuth) do staff atribuído. Null = sem responsável. */
  assigneeId: string | null;
  tags: CardTagId[];
  /** UserId do staff que criou o card. */
  createdById: string;
  /** Preenchido quando o card transita pra `done`; resetado se sai. */
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Card de Kanban interno. Status muda via move(); demais campos via patch.
 * Cards são staff-only — sem visibilidade de role/permissão dentro do
 * board (todo staff pode editar tudo, conforme decidido no plano de MVP).
 */
export class Card {
  private constructor(private props: CardProps) {}

  static create(input: {
    id: CardId;
    title: string;
    description?: string;
    status?: CardStatus;
    priority?: CardPriority;
    assigneeId?: string | null;
    tags?: string[];
    createdById: string;
    now?: Date;
  }): Card {
    const title = sanitizeTitle(input.title);
    const description = sanitizeDescription(input.description ?? "");
    const tags = sanitizeTags(input.tags ?? []);
    const status: CardStatus = input.status ?? "backlog";
    const now = input.now ?? new Date();

    return new Card({
      id: input.id,
      title,
      description,
      status,
      priority: input.priority ?? "medium",
      assigneeId: input.assigneeId ?? null,
      tags,
      createdById: input.createdById,
      completedAt: status === "done" ? now : null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: CardProps): Card {
    return new Card({ ...props });
  }

  patch(input: {
    title?: string;
    description?: string;
    priority?: CardPriority;
    assigneeId?: string | null;
    tags?: string[];
    now?: Date;
  }): void {
    if (input.title !== undefined) this.props.title = sanitizeTitle(input.title);
    if (input.description !== undefined) {
      this.props.description = sanitizeDescription(input.description);
    }
    if (input.priority !== undefined) this.props.priority = input.priority;
    if (input.assigneeId !== undefined) this.props.assigneeId = input.assigneeId;
    if (input.tags !== undefined) this.props.tags = sanitizeTags(input.tags);
    this.props.updatedAt = input.now ?? new Date();
  }

  moveTo(status: CardStatus, now: Date = new Date()): void {
    if (this.props.status === status) return;
    this.props.status = status;
    // completedAt rastreia a primeira entrada em `done`. Se sair de `done`
    // pra outra coluna e voltar, regrava — funciona como "concluído em X".
    if (status === "done") {
      this.props.completedAt = now;
    } else {
      this.props.completedAt = null;
    }
    this.props.updatedAt = now;
  }

  get id(): CardId {
    return this.props.id;
  }
  get title(): string {
    return this.props.title;
  }
  get description(): string {
    return this.props.description;
  }
  get status(): CardStatus {
    return this.props.status;
  }
  get priority(): CardPriority {
    return this.props.priority;
  }
  get assigneeId(): string | null {
    return this.props.assigneeId;
  }
  get tags(): CardTagId[] {
    return [...this.props.tags];
  }
  get createdById(): string {
    return this.props.createdById;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}

function sanitizeTitle(raw: string): string {
  const t = raw.trim();
  if (t.length === 0) {
    throw new InvalidCardInputError("Título não pode ser vazio.");
  }
  if (t.length > TITLE_MAX) {
    throw new InvalidCardInputError(
      `Título passou do limite de ${TITLE_MAX} caracteres.`,
    );
  }
  return t;
}

function sanitizeDescription(raw: string): string {
  if (raw.length > DESCRIPTION_MAX) {
    throw new InvalidCardInputError(
      `Descrição passou do limite de ${DESCRIPTION_MAX} caracteres.`,
    );
  }
  return raw;
}

function sanitizeTags(raw: string[]): CardTagId[] {
  // Filtra os ids inválidos silenciosamente. Como a UI só oferece tags do
  // catálogo, valor inválido aqui = caller buggy — não vale 400 só por isso.
  const seen = new Set<string>();
  const out: CardTagId[] = [];
  for (const t of raw) {
    if (!isCardTagId(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
