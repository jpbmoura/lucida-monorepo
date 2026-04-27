// Tipos espelhados do backend ([apps/api/src/domains/kanban]).
// Mudou um catálogo (status/priority/tags)? Mudar aqui também.

export const CARD_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
] as const;

export type CardStatus = (typeof CARD_STATUSES)[number];

export const STATUS_LABELS: Record<CardStatus, string> = {
  backlog: "Backlog",
  todo: "A fazer",
  in_progress: "Em andamento",
  review: "Revisão",
  done: "Concluído",
};

export const CARD_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type CardPriority = (typeof CARD_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<CardPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

/**
 * Cor visual da prioridade. Mantém grayscale-leve pra `low/medium` e
 * sobe pra amber/red conforme aumenta — discreto sem precisar de label
 * dupla.
 */
export const PRIORITY_DOT_CLASS: Record<CardPriority, string> = {
  low: "bg-gray-300",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-red-500",
};

export interface TagDefinition {
  id: string;
  label: string;
  color:
    | "red"
    | "amber"
    | "emerald"
    | "blue"
    | "purple"
    | "pink"
    | "gray"
    | "indigo";
}

export const CARD_TAGS: Record<string, TagDefinition> = {
  bug: { id: "bug", label: "Bug", color: "red" },
  produto: { id: "produto", label: "Produto", color: "blue" },
  comercial: { id: "comercial", label: "Comercial", color: "amber" },
  suporte: { id: "suporte", label: "Suporte", color: "purple" },
  ops: { id: "ops", label: "Operações", color: "gray" },
  conteudo: { id: "conteudo", label: "Conteúdo", color: "pink" },
  ia: { id: "ia", label: "IA", color: "indigo" },
  urgente: { id: "urgente", label: "Urgente", color: "red" },
};

export const CARD_TAG_LIST: TagDefinition[] = Object.values(CARD_TAGS);

/**
 * Mapeamento cor → classes Tailwind. Centraliza pra evitar inline
 * conditional spaghetti em cada lugar que renderiza tag.
 */
export const TAG_COLOR_CLASSES: Record<TagDefinition["color"], string> = {
  red: "bg-red-50 text-red-700 border-red-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  purple: "bg-purple-50 text-purple-700 border-purple-100",
  pink: "bg-pink-50 text-pink-700 border-pink-100",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
};

export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  status: CardStatus;
  priority: CardPriority;
  assigneeId: string | null;
  tags: string[];
  createdById: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListCardsResponse {
  cards: KanbanCard[];
}

export interface SingleCardResponse {
  card: KanbanCard;
}

export type KanbanActionResult =
  | { ok: true; card: KanbanCard }
  | { ok: false; code: string; message: string };

export type KanbanVoidActionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };
