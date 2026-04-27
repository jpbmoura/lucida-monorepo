/**
 * Colunas fixas do board interno de operações. Ordem importa — é como
 * aparecem no Kanban da esquerda pra direita.
 */
export const CARD_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
] as const;

export type CardStatus = (typeof CARD_STATUSES)[number];

export function isCardStatus(value: string): value is CardStatus {
  return (CARD_STATUSES as readonly string[]).includes(value);
}
