import type { PlanId } from "@/domains/billing/domain/plan.js";
import type { TopupId } from "@/domains/billing/domain/topup.js";

export interface SubscriptionTierCounts {
  basic_monthly: number;
  basic_yearly: number;
  pro_monthly: number;
  pro_yearly: number;
}

export interface TopupAggregate {
  count: number;
  revenueCents: number;
}

/**
 * Leituras agregadas cross-domain usadas pelo dashboard do Kintal. O Kintal
 * é read-only e atravessa coleções de outros bounded contexts (user BA,
 * subscriptions, credit_ledger) — manter as queries atrás desta porta deixa
 * o use case puro e permite swap por cache/warehouse depois.
 */
export interface KintalReadRepository {
  /** Count de users cuja `createdAt` caiu no intervalo. */
  countNewUsers(range: { from: Date; to: Date }): Promise<number>;

  /**
   * Distinct count de `ownerId` com ao menos uma entry `debit` e
   * `reason: "ai_consumption"` no intervalo. Serve como "usuários ativos".
   */
  countActiveUsers(range: { from: Date; to: Date }): Promise<number>;

  /** Count de subscriptions cuja `createdAt` caiu no intervalo. */
  countNewSubscribers(range: { from: Date; to: Date }): Promise<number>;

  /** Count de subscriptions status=active/past_due agrupadas por planId. */
  countActiveSubscriptionsByPlan(): Promise<Record<PlanId, number>>;

  /**
   * Count de subscriptions canceladas no intervalo. Cancelada = status
   * canceled com `canceledAt` dentro da janela.
   */
  countCanceledSubscriptions(range: { from: Date; to: Date }): Promise<number>;

  /**
   * Count de subscriptions que estavam ativas no instante `at` — ou seja,
   * criadas até `at` E que não haviam sido canceladas até `at`. Base pra
   * cálculo de churn.
   */
  countSubscriptionsActiveAt(at: Date): Promise<number>;

  /**
   * Agrega compras avulsas (ledger, reason=topup_purchase) no intervalo.
   * Devolve count + receita (centavos) por pacote. Os pacotes não
   * encontrados ficam com zeros.
   */
  aggregateTopupsInRange(range: {
    from: Date;
    to: Date;
  }): Promise<Record<TopupId, TopupAggregate>>;
}
