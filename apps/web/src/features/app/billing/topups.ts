/**
 * Catálogo de top-ups espelhado do backend.
 * Mudou um? Mude o outro.
 */

export type TopupId = "topup_2k" | "topup_5k" | "topup_15k";

export interface TopupDefinition {
  id: TopupId;
  name: string;
  priceCents: number;
  credits: number;
  tagline: string;
  highlight?: "popular" | "best-value";
}

export const TOPUPS: Record<TopupId, TopupDefinition> = {
  topup_2k: {
    id: "topup_2k",
    name: "Início",
    priceCents: 2990,
    credits: 2_000,
    tagline: "~3 provas de 10 questões",
  },
  topup_5k: {
    id: "topup_5k",
    name: "Plus",
    priceCents: 5990,
    credits: 5_000,
    tagline: "~7 provas de 10 questões",
    highlight: "popular",
  },
  topup_15k: {
    id: "topup_15k",
    name: "Power",
    priceCents: 14990,
    credits: 15_000,
    tagline: "~21 provas de 10 questões",
    highlight: "best-value",
  },
};

export const TOPUP_LIST: TopupDefinition[] = [
  TOPUPS.topup_2k,
  TOPUPS.topup_5k,
  TOPUPS.topup_15k,
];

export function costPer1kCredits(topup: TopupDefinition): number {
  return topup.priceCents / (topup.credits / 1000);
}
