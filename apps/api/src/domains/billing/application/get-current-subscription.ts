import type { SubscriptionRepository } from "../domain/subscription-repository.js";
import { getPlan, type PlanId } from "../domain/plan.js";

interface Input {
  ownerId: string;
}

export interface CurrentSubscriptionDTO {
  planId: PlanId;
  planName: string;
  status: "active" | "past_due" | "canceled" | "paused";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

/**
 * Retorna a assinatura ativa do user (ou null se não tem).
 * Usado pela UI pra decidir: mostrar CTA "Assinar" ou card "Plano atual".
 */
export class GetCurrentSubscriptionUseCase {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async execute(input: Input): Promise<CurrentSubscriptionDTO | null> {
    const sub = await this.subscriptions.findByOwnerActive(input.ownerId);
    if (!sub) return null;
    const plan = getPlan(sub.planId);
    return {
      planId: sub.planId,
      planName: plan.name,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  }
}
