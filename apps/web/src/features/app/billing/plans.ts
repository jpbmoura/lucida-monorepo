import type { PlanId } from "./data";

export type PlanTier = "basic" | "pro";
export type PlanPeriod = "monthly" | "yearly";

export interface PlanDefinition {
  id: PlanId;
  tier: PlanTier;
  period: PlanPeriod;
  name: string;
  /** Preço em centavos. */
  priceCents: number;
  /** Créditos por ciclo. */
  creditsPerCycle: number;
  marketingHighlights: string[];
}

/**
 * Catálogo espelhado do backend ([apps/api/src/domains/billing/domain/plan.ts]).
 * Mudou um? Mude o outro. TODO: extrair pra packages/ quando crescer.
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  basic_monthly: {
    id: "basic_monthly",
    tier: "basic",
    period: "monthly",
    name: "Básico",
    priceCents: 4990,
    creditsPerCycle: 5_000,
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
    creditsPerCycle: 60_000,
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
    creditsPerCycle: 15_000,
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
    creditsPerCycle: 180_000,
    marketingHighlights: [
      "180.000 créditos no ano",
      "Economia de 20% vs mensal",
      "Alunos e provas ilimitados",
      "Suporte prioritário",
    ],
  },
};

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function monthlyEquivalent(plan: PlanDefinition): string {
  if (plan.period === "monthly") return formatBRL(plan.priceCents);
  const per = plan.priceCents / 12;
  return formatBRL(Math.round(per));
}
