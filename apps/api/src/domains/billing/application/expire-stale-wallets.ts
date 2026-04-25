import { CreditWalletModel } from "../infrastructure/wallet-schema.js";
import type { WalletRepository } from "../domain/wallet-repository.js";
import type { LedgerRepository } from "../domain/ledger-repository.js";
import { LedgerEntry } from "../domain/ledger-entry.js";

export interface ExpireStaleWalletsOutput {
  scanned: number;
  expired: number;
  creditsExpired: number;
}

/**
 * Varre wallets com `expiresAt <= now` e saldo > 0. Zera o saldo e grava
 * ledger `reason: "expiration"` preservando histórico.
 *
 * Idempotente — rodar 2x seguidas não faz nada na segunda. Feito pra ser
 * chamado por cron externo (ex.: Railway cron) via endpoint interno com
 * secret, mas também pode ser invocado manualmente em admin ops.
 */
export class ExpireStaleWalletsUseCase {
  constructor(
    private readonly wallets: WalletRepository,
    private readonly ledger: LedgerRepository,
  ) {}

  async execute(): Promise<ExpireStaleWalletsOutput> {
    const now = new Date();

    // Busca direto no model pra evitar tocar todas as wallets do sistema pelo
    // repo (que carrega entity completa). Pegamos só o que importa pro expire.
    const stale = await CreditWalletModel.find({
      balance: { $gt: 0 },
      expiresAt: { $ne: null, $lte: now },
    })
      .lean<Array<{ _id: string; ownerId: string; source: string; balance: number }>>()
      .exec();

    let creditsExpired = 0;
    for (const doc of stale) {
      const wallet = await this.wallets.findById(
        // import dinâmico pra evitar ciclo (WalletId vive no domain).
        (await import("../domain/wallet-id.js")).WalletId.of(doc._id),
      );
      if (!wallet) continue;
      if (wallet.balance <= 0) continue;

      const amount = wallet.balance;
      const entry = LedgerEntry.create({
        id: this.ledger.nextId(),
        ownerId: wallet.ownerId,
        walletId: wallet.id,
        walletSource: wallet.source,
        type: "debit",
        amount,
        reason: "expiration",
        metadata: {
          expiredAt: wallet.expiresAt?.toISOString() ?? null,
          source: wallet.source,
        },
        now,
      });
      await this.ledger.save(entry);

      // Zera o saldo — persistência direta no model pra ser atômica.
      await CreditWalletModel.updateOne(
        { _id: doc._id, balance: { $gte: amount } },
        { $set: { balance: 0 } },
      ).exec();

      creditsExpired += amount;
    }

    return {
      scanned: stale.length,
      expired: stale.length,
      creditsExpired,
    };
  }
}
