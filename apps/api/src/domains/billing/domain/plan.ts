/**
 * Catálogo estático de planos. Não há collection `plans` no Mongo — a fonte
 * de verdade é esse arquivo + IDs do Stripe em env. Pra adicionar um plano:
 * 1. cria Product/Price no Stripe (ou reusa)
 * 2. adiciona a entrada aqui com o price_id correspondente
 * 3. exporta o env var e mapeia em getStripePriceId()
 *
 * Valores de crédito/preço são fonte da verdade pra:
 * - quantos créditos depositar na renovação (webhook usa isso, não o Stripe)
 * - o que mostrar na página /precos e no /app/billing
 * - decidir se um upgrade é "pra cima" (upsell) ou "pra baixo"
 */

export type PlanId =
  | "basic_monthly"
  | "basic_yearly"
  | "pro_monthly"
  | "pro_yearly";

export type PlanTier = "basic" | "pro";
export type PlanPeriod = "monthly" | "yearly";

export interface PlanDefinition {
  id: PlanId;
  tier: PlanTier;
  period: PlanPeriod;
  name: string;
  /** Preço em centavos. */
  priceCents: number;
  /** Moeda ISO 4217 — sempre "BRL" nesse catálogo. */
  currency: "BRL";
  /** Créditos depositados a cada ciclo (mensal) ou na ativação (anual). */
  creditsPerCycle: number;
  /**
   * "monthly" deposita mensalmente e expira no fim do ciclo.
   * "yearly" deposita tudo no começo — mas na nossa decisão o reset também
   * zera+credita no aniversário, então operacionalmente é parecido.
   */
  cycleDurationDays: number;
  marketingHighlights: string[];
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  basic_monthly: {
    id: "basic_monthly",
    tier: "basic",
    period: "monthly",
    name: "Básico",
    priceCents: 4990,
    currency: "BRL",
    creditsPerCycle: 5_000,
    cycleDurationDays: 30,
    marketingHighlights: [
      "5.000 créditos por mês",
      "Alunos e provas ilimitados",
      "Correção automática ilimitada",
      "Suporte padrão",
    ],
  },
  basic_yearly: {
    id: "basic_yearly",
    tier: "basic",
    period: "yearly",
    name: "Básico Anual",
    priceCents: 47900,
    currency: "BRL",
    creditsPerCycle: 60_000,
    cycleDurationDays: 365,
    marketingHighlights: [
      "60.000 créditos no ano",
      "Economia de 20% vs mensal",
      "Alunos e provas ilimitados",
      "Suporte padrão",
    ],
  },
  pro_monthly: {
    id: "pro_monthly",
    tier: "pro",
    period: "monthly",
    name: "Pro",
    priceCents: 9990,
    currency: "BRL",
    creditsPerCycle: 15_000,
    cycleDurationDays: 30,
    marketingHighlights: [
      "15.000 créditos por mês",
      "Alunos e provas ilimitados",
      "Correção automática ilimitada",
      "Suporte prioritário",
    ],
  },
  pro_yearly: {
    id: "pro_yearly",
    tier: "pro",
    period: "yearly",
    name: "Pro Anual",
    priceCents: 95900,
    currency: "BRL",
    creditsPerCycle: 180_000,
    cycleDurationDays: 365,
    marketingHighlights: [
      "180.000 créditos no ano",
      "Economia de 20% vs mensal",
      "Alunos e provas ilimitados",
      "Suporte prioritário",
    ],
  },
};

export function getPlan(id: PlanId): PlanDefinition {
  const plan = PLANS[id];
  if (!plan) throw new Error(`Plano desconhecido: ${id}`);
  return plan;
}

export function isPlanId(value: string): value is PlanId {
  return value in PLANS;
}
