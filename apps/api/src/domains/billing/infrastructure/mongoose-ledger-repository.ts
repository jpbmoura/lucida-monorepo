import { randomUUID } from "node:crypto";
import type { LedgerRepository } from "../domain/ledger-repository.js";
import { LedgerEntryId } from "../domain/ledger-entry-id.js";
import { LedgerEntry } from "../domain/ledger-entry.js";
import { WalletId } from "../domain/wallet-id.js";
import type { BillingScope } from "../domain/billing-scope.js";
import { LedgerEntryModel, type LedgerEntryDoc } from "./ledger-schema.js";

export class MongooseLedgerRepository implements LedgerRepository {
  nextId(): LedgerEntryId {
    return LedgerEntryId.of(randomUUID());
  }

  async save(entry: LedgerEntry): Promise<void> {
    // Ledger é append-only — nunca faz update.
    await LedgerEntryModel.create({
      _id: entry.id.toString(),
      scope: entry.scope,
      ownerId: entry.ownerId,
      actorUserId: entry.actorUserId,
      walletId: entry.walletId.toString(),
      walletSource: entry.walletSource,
      type: entry.type,
      amount: entry.amount,
      reason: entry.reason,
      relatedAction: entry.relatedAction,
      tokensUsed: entry.tokensUsed,
      billingPeriodId: entry.billingPeriodId,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    });
  }

  async findByOwner(input: {
    ownerId: string;
    scope?: BillingScope;
    limit: number;
    before?: Date;
  }): Promise<LedgerEntry[]> {
    const filter: Record<string, unknown> = {
      scope: input.scope ?? "user",
      ownerId: input.ownerId,
    };
    if (input.before) {
      filter.createdAt = { $lt: input.before };
    }
    const docs = await LedgerEntryModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .lean<LedgerEntryDoc[]>()
      .exec();
    return docs.map(toEntity);
  }
}

function toEntity(doc: LedgerEntryDoc): LedgerEntry {
  return LedgerEntry.restore({
    id: LedgerEntryId.of(doc._id),
    // Docs legados sem `scope`/`actorUserId`/`billingPeriodId` são lidos
    // com defaults via schema. Aqui protegemos o código novo contra
    // undefined em bases antigas.
    scope: doc.scope ?? "user",
    ownerId: doc.ownerId,
    actorUserId: doc.actorUserId ?? null,
    walletId: WalletId.of(doc.walletId),
    walletSource: doc.walletSource,
    type: doc.type,
    amount: doc.amount,
    reason: doc.reason,
    relatedAction: doc.relatedAction,
    tokensUsed: doc.tokensUsed,
    billingPeriodId: doc.billingPeriodId ?? null,
    metadata: doc.metadata ?? {},
    createdAt: doc.createdAt,
  });
}
