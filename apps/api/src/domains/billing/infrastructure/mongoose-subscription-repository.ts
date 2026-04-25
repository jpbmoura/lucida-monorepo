import { randomUUID } from "node:crypto";
import type { SubscriptionRepository } from "../domain/subscription-repository.js";
import { SubscriptionId } from "../domain/subscription-id.js";
import { Subscription } from "../domain/subscription.js";
import {
  SubscriptionModel,
  type SubscriptionDoc,
} from "./subscription-schema.js";

export class MongooseSubscriptionRepository implements SubscriptionRepository {
  nextId(): SubscriptionId {
    return SubscriptionId.of(randomUUID());
  }

  async save(subscription: Subscription): Promise<void> {
    await SubscriptionModel.updateOne(
      { _id: subscription.id.toString() },
      {
        $set: {
          ownerId: subscription.ownerId,
          planId: subscription.planId,
          status: subscription.status,
          stripeSubscriptionId: subscription.stripeSubscriptionId,
          stripeCustomerId: subscription.stripeCustomerId,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          canceledAt: subscription.canceledAt,
        },
        $setOnInsert: { _id: subscription.id.toString() },
      },
      { upsert: true },
    );
  }

  async findById(id: SubscriptionId): Promise<Subscription | null> {
    const doc = await SubscriptionModel.findById(id.toString())
      .lean<SubscriptionDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByOwnerActive(ownerId: string): Promise<Subscription | null> {
    const doc = await SubscriptionModel.findOne({
      ownerId,
      status: { $in: ["active", "past_due"] },
    })
      .sort({ updatedAt: -1 })
      .lean<SubscriptionDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findByStripeSubscriptionId(
    stripeId: string,
  ): Promise<Subscription | null> {
    const doc = await SubscriptionModel.findOne({ stripeSubscriptionId: stripeId })
      .lean<SubscriptionDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findStripeCustomerByOwner(ownerId: string): Promise<string | null> {
    // Busca em qualquer subscription do owner (mesmo canceladas) — Stripe
    // Customer é persistente, dá pra reusar em um novo checkout.
    const doc = await SubscriptionModel.findOne({ ownerId })
      .sort({ createdAt: -1 })
      .select({ stripeCustomerId: 1 })
      .lean<{ stripeCustomerId: string }>()
      .exec();
    return doc?.stripeCustomerId ?? null;
  }
}

function toEntity(doc: SubscriptionDoc): Subscription {
  return Subscription.restore({
    id: SubscriptionId.of(doc._id),
    ownerId: doc.ownerId,
    planId: doc.planId,
    status: doc.status,
    stripeSubscriptionId: doc.stripeSubscriptionId,
    stripeCustomerId: doc.stripeCustomerId,
    currentPeriodStart: doc.currentPeriodStart,
    currentPeriodEnd: doc.currentPeriodEnd,
    cancelAtPeriodEnd: doc.cancelAtPeriodEnd,
    canceledAt: doc.canceledAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
