import type { Subscription } from "./subscription.js";
import type { SubscriptionId } from "./subscription-id.js";

export interface SubscriptionRepository {
  nextId(): SubscriptionId;
  save(subscription: Subscription): Promise<void>;
  findById(id: SubscriptionId): Promise<Subscription | null>;
  findByOwnerActive(ownerId: string): Promise<Subscription | null>;
  findByStripeSubscriptionId(stripeId: string): Promise<Subscription | null>;
  findStripeCustomerByOwner(ownerId: string): Promise<string | null>;
}
