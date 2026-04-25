import mongoose from "mongoose";
import type { LedgerEntry } from "../domain/ledger-entry.js";
import { CreditWalletModel } from "./wallet-schema.js";
import { LedgerEntryModel } from "./ledger-schema.js";

/**
 * Plan de débito pré-computado pelo use case — lista de (walletId, take) que
 * soma exatamente `totalAmount`. O serviço só aplica.
 */
export interface DebitPlan {
  walletId: string;
  walletSource: string;
  take: number;
}

/**
 * Serviço que aplica o plano de débito atomicamente junto com as entradas
 * de ledger. Tudo ou nada.
 *
 * Estratégia:
 * 1. Usa transações Mongo (requer replica set — padrão em Atlas e em docker
 *    de dev com `--replSet`).
 * 2. Cada updateOne usa `balance: { $gte: take }` como guard — se alguém
 *    debitou antes de nós, a transação aborta e o retry da camada acima
 *    refaz o plano.
 *
 * Custo de replica set: em dev local sem RS, transações falham com erro
 * 20. Documentado em .env.example.
 */
export class AtomicDebitService {
  async apply(input: {
    plan: DebitPlan[];
    ledgerEntries: LedgerEntry[];
  }): Promise<void> {
    if (input.plan.length === 0) return;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        for (const step of input.plan) {
          const result = await CreditWalletModel.updateOne(
            { _id: step.walletId, balance: { $gte: step.take } },
            { $inc: { balance: -step.take } },
            { session },
          );
          if (result.matchedCount === 0) {
            // Outro débito pegou o saldo antes da gente. Aborta a transação
            // pro caller recalcular o plano.
            throw new StaleBalanceError();
          }
        }

        // Append-only do ledger — todos no mesmo commit.
        for (const entry of input.ledgerEntries) {
          await LedgerEntryModel.create(
            [
              {
                _id: entry.id.toString(),
                ownerId: entry.ownerId,
                walletId: entry.walletId.toString(),
                walletSource: entry.walletSource,
                type: entry.type,
                amount: entry.amount,
                reason: entry.reason,
                relatedAction: entry.relatedAction,
                tokensUsed: entry.tokensUsed,
                metadata: entry.metadata,
                createdAt: entry.createdAt,
              },
            ],
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }
  }
}

/**
 * Erro interno pro caller reexecutar o planejamento (read → plan → apply).
 * Não vaza pro controller.
 */
export class StaleBalanceError extends Error {
  constructor() {
    super("Wallet balance changed between read and debit.");
  }
}
