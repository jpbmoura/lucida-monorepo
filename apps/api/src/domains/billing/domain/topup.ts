/**
 * Catálogo estático de pacotes de créditos avulsos (top-ups).
 * Compra única — não renova. Créditos expiram em 12 meses.
 *
 * Fonte de verdade pra:
 * - Quantos créditos depositar após webhook checkout.session.completed
 * - Preço exibido na /app/billing
 */

export type TopupId = "topup_2k" | "topup_5k" | "topup_15k";

export interface TopupDefinition {
  id: TopupId;
  name: string;
  priceCents: number;
  currency: "BRL";
  credits: number;
  /** Marketing hint opcional — qual é o "bom pra" do pacote. */
  tagline: string;
  /** Mostra badge "mais popular" ou "melhor custo". */
  highlight?: "popular" | "best-value";
}

export const TOPUPS: Record<TopupId, TopupDefinition> = {
  topup_2k: {
    id: "topup_2k",
    name: "Início",
    priceCents: 2990,
    currency: "BRL",
    credits: 2_000,
    tagline: "~80 provas de 10 questões",
  },
  topup_5k: {
    id: "topup_5k",
    name: "Plus",
    priceCents: 5990,
    currency: "BRL",
    credits: 5_000,
    tagline: "~200 provas de 10 questões",
    highlight: "popular",
  },
  topup_15k: {
    id: "topup_15k",
    name: "Power",
    priceCents: 13990,
    currency: "BRL",
    credits: 15_000,
    tagline: "~600 provas de 10 questões",
    highlight: "best-value",
  },
};

/** Validade dos créditos top-up — 12 meses conforme decisão de produto. */
export const TOPUP_VALIDITY_DAYS = 365;

export function getTopup(id: TopupId): TopupDefinition {
  const t = TOPUPS[id];
  if (!t) throw new Error(`Top-up desconhecido: ${id}`);
  return t;
}

export function isTopupId(value: string): value is TopupId {
  return value in TOPUPS;
}
