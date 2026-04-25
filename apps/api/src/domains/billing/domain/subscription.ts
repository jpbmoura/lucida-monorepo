import { SubscriptionId } from "./subscription-id.js";
import type { PlanId } from "./plan.js";

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "paused";

export interface SubscriptionProps {
  id: SubscriptionId;
  ownerId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  /** ID da Subscription no Stripe — único por user/assinatura. */
  stripeSubscriptionId: string;
  /** Customer no Stripe — persistente por user (reusado em checkouts futuros). */
  stripeCustomerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription espelha o estado atual do Stripe (source of truth).
 * A gente reage a webhooks pra manter atualizado. Nunca cria/cancela
 * sem passar pelo Stripe.
 *
 * Há no máximo uma Subscription "ativa" por ownerId — upgrade/downgrade
 * usa o mesmo stripeSubscriptionId (Stripe atualiza, a gente atualiza
 * campos). Se cancelar e assinar de novo, é uma nova Subscription com novo
 * stripeSubscriptionId.
 */
export class Subscription {
  private constructor(private props: SubscriptionProps) {}

  static create(input: {
    id: SubscriptionId;
    ownerId: string;
    planId: PlanId;
    status: SubscriptionStatus;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd?: boolean;
    now?: Date;
  }): Subscription {
    const now = input.now ?? new Date();
    return new Subscription({
      id: input.id,
      ownerId: input.ownerId,
      planId: input.planId,
      status: input.status,
      stripeSubscriptionId: input.stripeSubscriptionId,
      stripeCustomerId: input.stripeCustomerId,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      canceledAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: SubscriptionProps): Subscription {
    return new Subscription({ ...props });
  }

  get id(): SubscriptionId {
    return this.props.id;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get planId(): PlanId {
    return this.props.planId;
  }
  get status(): SubscriptionStatus {
    return this.props.status;
  }
  get stripeSubscriptionId(): string {
    return this.props.stripeSubscriptionId;
  }
  get stripeCustomerId(): string {
    return this.props.stripeCustomerId;
  }
  get currentPeriodStart(): Date {
    return this.props.currentPeriodStart;
  }
  get currentPeriodEnd(): Date {
    return this.props.currentPeriodEnd;
  }
  get cancelAtPeriodEnd(): boolean {
    return this.props.cancelAtPeriodEnd;
  }
  get canceledAt(): Date | null {
    return this.props.canceledAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateFromStripe(input: {
    planId: PlanId;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
    now?: Date;
  }): void {
    this.props.planId = input.planId;
    this.props.status = input.status;
    this.props.currentPeriodStart = input.currentPeriodStart;
    this.props.currentPeriodEnd = input.currentPeriodEnd;
    this.props.cancelAtPeriodEnd = input.cancelAtPeriodEnd;
    this.props.canceledAt = input.canceledAt;
    this.props.updatedAt = input.now ?? new Date();
  }

  isActive(): boolean {
    return this.props.status === "active" || this.props.status === "past_due";
  }

  isOwnedBy(ownerId: string): boolean {
    return this.props.ownerId === ownerId;
  }
}
