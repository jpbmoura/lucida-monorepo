import type { WalletRepository } from "@/domains/billing/domain/wallet-repository.js";
import type { LedgerRepository } from "@/domains/billing/domain/ledger-repository.js";
import { CreditWallet } from "@/domains/billing/domain/credit-wallet.js";
import { LedgerEntry } from "@/domains/billing/domain/ledger-entry.js";
import type { DebitCreditsUseCase } from "@/domains/billing/application/debit-credits.js";
import { InsufficientCreditsError } from "@/domains/billing/domain/billing-errors.js";
import type { KintalUsersRepository } from "./ports/kintal-users-repository.js";
import {
  InvalidCreditAdjustmentError,
  KintalUserNotFoundError,
} from "../domain/users-errors.js";

export interface AdjustUserCreditsInput {
  /** User alvo (BA userId). */
  userId: string;
  /** Staff que executou a ação — vai pro `actorUserId` do ledger. */
  actorUserId: string;
  /**
   * Inteiro não-zero. Positivo = creditar (cria wallet admin_grant nova).
   * Negativo = debitar (consome wallets existentes em ordem de prioridade).
   */
  amount: number;
  /** Justificativa livre, gravada em `metadata.note` no ledger. */
  note?: string;
}

export interface AdjustUserCreditsResult {
  delta: number;
  newBalance: number;
}

/**
 * Ajuste manual de créditos do usuário a partir do Kintal. Mantém auditoria
 * via ledger:
 *  - delta > 0 → wallet `admin_grant` nova + ledger entry reason=`admin_grant`.
 *  - delta < 0 → debit FIFO via DebitCreditsUseCase, reason=`adjustment`.
 *
 * O caller (controller) é responsável por traduzir `InsufficientCreditsError`
 * pra resposta HTTP — propagamos o erro do billing intacto.
 */
export class AdjustUserCreditsUseCase {
  constructor(
    private readonly users: KintalUsersRepository,
    private readonly wallets: WalletRepository,
    private readonly ledger: LedgerRepository,
    private readonly debitCredits: DebitCreditsUseCase,
  ) {}

  async execute(
    input: AdjustUserCreditsInput,
  ): Promise<AdjustUserCreditsResult> {
    if (!Number.isInteger(input.amount) || input.amount === 0) {
      throw new InvalidCreditAdjustmentError(
        "Quantidade precisa ser um inteiro não-zero.",
      );
    }

    const target = await this.users.findById(input.userId);
    if (!target) throw new KintalUserNotFoundError();

    const before = target.creditBalance;
    const metadata: Record<string, unknown> = {
      source: "kintal:adjust-credits",
      adjustedBy: input.actorUserId,
    };
    if (input.note?.trim()) metadata.note = input.note.trim();

    if (input.amount > 0) {
      const wallet = CreditWallet.create({
        id: this.wallets.nextId(),
        scope: "user",
        ownerId: input.userId,
        source: "admin_grant",
        initialBalance: input.amount,
        expiresAt: null,
      });
      await this.wallets.save(wallet);

      const entry = LedgerEntry.create({
        id: this.ledger.nextId(),
        scope: "user",
        ownerId: input.userId,
        actorUserId: input.actorUserId,
        walletId: wallet.id,
        walletSource: wallet.source,
        type: "credit",
        amount: input.amount,
        reason: "admin_grant",
        metadata,
      });
      await this.ledger.save(entry);

      return { delta: input.amount, newBalance: before + input.amount };
    }

    const toDebit = -input.amount;
    if (toDebit > before) {
      throw new InsufficientCreditsError(toDebit, before);
    }

    await this.debitCredits.execute({
      ownerId: input.userId,
      scope: "user",
      actorUserId: input.actorUserId,
      amount: toDebit,
      reason: "adjustment",
      metadata,
    });

    return { delta: input.amount, newBalance: before - toDebit };
  }
}
