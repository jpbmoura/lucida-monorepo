import { env } from "@/env.js";
import type { TopupId } from "../../domain/topup.js";

export function topupToStripePriceId(id: TopupId): string {
  const priceId = mapping()[id];
  if (!priceId) {
    throw new Error(
      `Stripe Price ID não configurado pro top-up "${id}". Verifique STRIPE_TOPUP_*_PRICE_ID no .env.`,
    );
  }
  return priceId;
}

export function stripePriceIdToTopup(priceId: string): TopupId | null {
  const m = mapping();
  for (const [topupId, configured] of Object.entries(m)) {
    if (configured === priceId) return topupId as TopupId;
  }
  return null;
}

function mapping(): Record<TopupId, string | undefined> {
  return {
    topup_2k: env.STRIPE_TOPUP_2K_PRICE_ID,
    topup_5k: env.STRIPE_TOPUP_5K_PRICE_ID,
    topup_15k: env.STRIPE_TOPUP_15K_PRICE_ID,
  };
}
