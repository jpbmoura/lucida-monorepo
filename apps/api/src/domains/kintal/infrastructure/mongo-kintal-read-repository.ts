import type { Db } from "mongodb";
import mongoose from "mongoose";
import { SubscriptionModel } from "@/domains/billing/infrastructure/subscription-schema.js";
import { LedgerEntryModel } from "@/domains/billing/infrastructure/ledger-schema.js";
import {
  isTopupId,
  TOPUPS,
  type TopupId,
} from "@/domains/billing/domain/topup.js";
import type { PlanId } from "@/domains/billing/domain/plan.js";
import type {
  KintalReadRepository,
  TopupAggregate,
} from "../application/ports/kintal-read-repository.js";

/**
 * Impl do read repository do Kintal. Consulta três stores:
 *   - `user` (coleção BA, via driver nativo — não tem Mongoose model)
 *   - `subscriptions` (Mongoose, via SubscriptionModel)
 *   - `credit_ledger` (Mongoose, via LedgerEntryModel)
 *
 * Todas as queries são read-only. Preferimos aggregation pipelines pra evitar
 * carregar docs inteiros quando só precisamos de contagens/somas.
 */
export class MongoKintalReadRepository implements KintalReadRepository {
  constructor(private readonly authDb: Db) {}

  async countNewUsers(range: { from: Date; to: Date }): Promise<number> {
    const users = this.authDb.collection("user");
    return users.countDocuments({
      createdAt: { $gte: range.from, $lt: range.to },
    });
  }

  async countActiveUsers(range: { from: Date; to: Date }): Promise<number> {
    // "Ativo" = pelo menos um debit ai_consumption na janela. Distinct por
    // ownerId (o ledger guarda ownerId do wallet, que em scope=user equivale
    // ao userId).
    const [result] = await LedgerEntryModel.aggregate<{ count: number }>([
      {
        $match: {
          scope: "user",
          type: "debit",
          reason: "ai_consumption",
          createdAt: { $gte: range.from, $lt: range.to },
        },
      },
      { $group: { _id: "$ownerId" } },
      { $count: "count" },
    ]);
    return result?.count ?? 0;
  }

  async countNewSubscribers(range: { from: Date; to: Date }): Promise<number> {
    return SubscriptionModel.countDocuments({
      createdAt: { $gte: range.from, $lt: range.to },
    });
  }

  async countActiveSubscriptionsByPlan(): Promise<Record<PlanId, number>> {
    const rows = await SubscriptionModel.aggregate<{
      _id: PlanId;
      count: number;
    }>([
      { $match: { status: { $in: ["active", "past_due"] } } },
      { $group: { _id: "$planId", count: { $sum: 1 } } },
    ]);
    const base: Record<PlanId, number> = {
      basic_monthly: 0,
      basic_yearly: 0,
      pro_monthly: 0,
      pro_yearly: 0,
    };
    for (const r of rows) base[r._id] = r.count;
    return base;
  }

  async countCanceledSubscriptions(range: {
    from: Date;
    to: Date;
  }): Promise<number> {
    return SubscriptionModel.countDocuments({
      status: "canceled",
      canceledAt: { $gte: range.from, $lt: range.to },
    });
  }

  async countSubscriptionsActiveAt(at: Date): Promise<number> {
    // Critério: criadas <= at AND (nunca canceladas OR canceladas depois de at).
    return SubscriptionModel.countDocuments({
      createdAt: { $lte: at },
      $or: [{ canceledAt: null }, { canceledAt: { $gt: at } }],
    });
  }

  async aggregateTopupsInRange(range: {
    from: Date;
    to: Date;
  }): Promise<Record<TopupId, TopupAggregate>> {
    // Agrupa lançamentos topup_purchase por `metadata.topupId` e soma
    // quantidade + receita. A receita vem de TOPUPS[id].priceCents — o ledger
    // não guarda o valor pago, só o crédito depositado.
    const rows = await LedgerEntryModel.aggregate<{
      _id: string;
      count: number;
    }>([
      {
        $match: {
          reason: "topup_purchase",
          createdAt: { $gte: range.from, $lt: range.to },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$metadata.topupId", "unknown"] },
          count: { $sum: 1 },
        },
      },
    ]);

    const base: Record<TopupId, TopupAggregate> = {
      topup_2k: { count: 0, revenueCents: 0 },
      topup_5k: { count: 0, revenueCents: 0 },
      topup_15k: { count: 0, revenueCents: 0 },
    };
    for (const r of rows) {
      if (!isTopupId(r._id)) continue;
      base[r._id] = {
        count: r.count,
        revenueCents: r.count * TOPUPS[r._id].priceCents,
      };
    }
    return base;
  }
}

// Mantém o import de mongoose pra caso algum consumidor externo do arquivo
// referencie a conexão; hoje só é necessário por causa dos Models.
void mongoose;
