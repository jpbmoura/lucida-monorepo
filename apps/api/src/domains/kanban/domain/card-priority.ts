export const CARD_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type CardPriority = (typeof CARD_PRIORITIES)[number];

export function isCardPriority(value: string): value is CardPriority {
  return (CARD_PRIORITIES as readonly string[]).includes(value);
}
