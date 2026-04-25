import Stripe from "stripe";
import { env } from "@/env.js";

/**
 * Factory singleton do cliente Stripe. Lança se SECRET não está configurado —
 * o caller (controllers de checkout/portal) deve checar antes.
 */
let cached: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurado — módulo de billing offline.",
    );
  }
  if (!cached) {
    cached = new Stripe(env.STRIPE_SECRET_KEY, {
      // Usa a versão padrão do SDK instalado — os types correspondem.
    });
  }
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}
