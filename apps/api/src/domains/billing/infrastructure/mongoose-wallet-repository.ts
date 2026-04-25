import { randomUUID } from "node:crypto";
import type { WalletRepository } from "../domain/wallet-repository.js";
import { WalletId } from "../domain/wallet-id.js";
import { CreditWallet } from "../domain/credit-wallet.js";
import {
  CREDIT_SOURCE_PRIORITY,
  type CreditSource,
} from "../domain/credit-source.js";
import type { BillingScope } from "../domain/billing-scope.js";
import { CreditWalletModel, type CreditWalletDoc } from "./wallet-schema.js";

export class MongooseWalletRepository implements WalletRepository {
  nextId(): WalletId {
    return WalletId.of(randomUUID());
  }

  async save(wallet: CreditWallet): Promise<void> {
    await CreditWalletModel.updateOne(
      { _id: wallet.id.toString() },
      {
        $set: {
          scope: wallet.scope,
          ownerId: wallet.ownerId,
          source: wallet.source,
          balance: wallet.balance,
          expiresAt: wallet.expiresAt,
          externalRef: wallet.externalRef,
        },
        $setOnInsert: {
          _id: wallet.id.toString(),
        },
      },
      { upsert: true },
    );
  }

  async findById(id: WalletId): Promise<CreditWallet | null> {
    const doc = await CreditWalletModel.findById(id.toString())
      .lean<CreditWalletDoc>()
      .exec();
    return doc ? toEntity(doc) : null;
  }

  async findActiveByOwner(
    ownerId: string,
    scope: BillingScope = "user",
  ): Promise<CreditWallet[]> {
    const now = new Date();
    const docs = await CreditWalletModel.find({
      scope,
      ownerId,
      balance: { $gt: 0 },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
      .lean<CreditWalletDoc[]>()
      .exec();
    // Ordenação de prioridade é de domínio — feita em JS pra evitar índices
    // derivados da constante de prioridade.
    return docs.map(toEntity).sort(compareByPriority);
  }

  async findAllByOwner(
    ownerId: string,
    scope: BillingScope = "user",
  ): Promise<CreditWallet[]> {
    const docs = await CreditWalletModel.find({ scope, ownerId })
      .lean<CreditWalletDoc[]>()
      .exec();
    return docs.map(toEntity).sort(compareByPriority);
  }

  async findByOwnerAndSource(
    ownerId: string,
    source: CreditSource,
    scope: BillingScope = "user",
  ): Promise<CreditWallet[]> {
    const docs = await CreditWalletModel.find({ scope, ownerId, source })
      .sort({ createdAt: 1 })
      .lean<CreditWalletDoc[]>()
      .exec();
    return docs.map(toEntity);
  }
}

function compareByPriority(a: CreditWallet, b: CreditWallet): number {
  const pa = CREDIT_SOURCE_PRIORITY[a.source];
  const pb = CREDIT_SOURCE_PRIORITY[b.source];
  if (pa !== pb) return pa - pb;
  // Dentro da mesma source, o que expira antes vai primeiro. Null = nunca.
  const ea = a.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const eb = b.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (ea !== eb) return ea - eb;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

function toEntity(doc: CreditWalletDoc): CreditWallet {
  return CreditWallet.restore({
    id: WalletId.of(doc._id),
    // Docs legados sem `scope` são lidos como "user" via default do schema.
    scope: doc.scope ?? "user",
    ownerId: doc.ownerId,
    source: doc.source,
    balance: doc.balance,
    expiresAt: doc.expiresAt,
    externalRef: doc.externalRef,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}
