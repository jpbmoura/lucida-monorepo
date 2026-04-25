import { env } from "@/env.js";
import { getPlan, type PlanId } from "../../domain/plan.js";

/**
 * Mapa bidirecional entre nosso PlanId e o Price ID do Stripe.
 * Fonte: variáveis de ambiente. Um PlanId sem env configurado lança erro
 * quando alguém tenta usar — pra dev local com Stripe desligado, isso só
 * importa quando o usuário clica em "assinar".
 */

export function planToStripePriceId(planId: PlanId): string {
  const id = mapping()[planId];
  if (!id) {
    throw new Error(
      `Stripe Price ID não configurado pro plano "${planId}". Verifique STRIPE_*_PRICE_ID no .env.`,
    );
  }
  return id;
}

export function stripePriceIdToPlan(priceId: string): PlanId | null {
  const m = mapping();
  for (const [planId, configured] of Object.entries(m)) {
    if (configured === priceId) return planId as PlanId;
  }
  return null;
}

function mapping(): Record<PlanId, string | undefined> {
  return {
    basic_monthly: env.STRIPE_BASIC_MONTHLY_PRICE_ID,
    basic_yearly: env.STRIPE_BASIC_YEARLY_PRICE_ID,
    pro_monthly: env.STRIPE_PRO_MONTHLY_PRICE_ID,
    pro_yearly: env.STRIPE_PRO_YEARLY_PRICE_ID,
  };
}

/** Hook pra validação no startup — confirma que todos os planos existem. */
export function assertPlansConfigured(): void {
  const m = mapping();
  const missing = (Object.keys(m) as PlanId[]).filter(
    (id) => !m[id],
  );
  if (missing.length > 0) {
    // Retornar não lançar — startup não deve morrer por isso. Só logar.
    console.warn(
      `[billing] Stripe Price IDs não configurados: ${missing
        .map((id) => `${id} (${getPlan(id).name})`)
        .join(", ")}. Checkout desses planos vai falhar.`,
    );
  }
}
