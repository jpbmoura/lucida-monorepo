import type { WalletRepository } from "@/domains/billing/domain/wallet-repository.js";
import type { LedgerRepository } from "@/domains/billing/domain/ledger-repository.js";
import { CreditWallet } from "@/domains/billing/domain/credit-wallet.js";
import { LedgerEntry } from "@/domains/billing/domain/ledger-entry.js";
import type { DebitCreditsUseCase } from "@/domains/billing/application/debit-credits.js";
import { InsufficientCreditsError } from "@/domains/billing/domain/billing-errors.js";
import type { KintalInstitutionsRepository } from "./ports/kintal-institutions-repository.js";
import {
  InstitutionNotFoundError,
  InvalidInstitutionInputError,
} from "../domain/institutions-errors.js";

export interface AdjustInstitutionCreditsInput {
  organizationId: string;
  /** Staff que executou a ação. */
  actorUserId: string;
  /**
   * Inteiro não-zero. Positivo = creditar (cria wallet org admin_grant nova).
   * Negativo = debitar (consome wallets org existentes em ordem de prioridade).
   */
  amount: number;
  /** Validade dos créditos em dias. Null/0 = nunca expira. */
  expiresInDays?: number | null;
  /** Justificativa livre, gravada em `metadata.note`. */
  note?: string;
}

export interface AdjustInstitutionCreditsResult {
  delta: number;
}

/**
 * Recarregar/abater créditos de uma instituição via Kintal — substitui o
 * script `billing:add-org-credits`. Mantém auditoria via ledger:
 *
 *   - delta > 0 → cria wallet `admin_grant` (scope=org) + ledger credit.
 *   - delta < 0 → debit FIFO via DebitCreditsUseCase, reason=`adjustment`.
 *
 * Em modo `unlimited` o crédito não tem efeito prático (BillingService
 * curto-circuita), mas a operação é permitida — útil pra "preparar" uma
 * org que vai sair do modo cortesia.
 */
export class AdjustInstitutionCreditsUseCase {
  constructor(
    private readonly institutions: KintalInstitutionsRepository,
    private readonly wallets: WalletRepository,
    private readonly ledger: LedgerRepository,
    private readonly debitCredits: DebitCreditsUseCase,
  ) {}

  async execute(
    input: AdjustInstitutionCreditsInput,
  ): Promise<AdjustInstitutionCreditsResult> {
    if (!Number.isInteger(input.amount) || input.amount === 0) {
      throw new InvalidInstitutionInputError(
        "Quantidade precisa ser um inteiro não-zero.",
      );
    }
    const exists = await this.institutions.exists(input.organizationId);
    if (!exists) throw new InstitutionNotFoundError();

    const metadata: Record<string, unknown> = {
      source: "kintal:adjust-org-credits",
      adjustedBy: input.actorUserId,
    };
    if (input.note?.trim()) metadata.note = input.note.trim();

    if (input.amount > 0) {
      const expiresAt =
        input.expiresInDays && input.expiresInDays > 0
          ? new Date(
              Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000,
            )
          : null;

      const wallet = CreditWallet.create({
        id: this.wallets.nextId(),
        scope: "org",
        ownerId: input.organizationId,
        source: "admin_grant",
        initialBalance: input.amount,
        expiresAt,
      });
      await this.wallets.save(wallet);

      const entry = LedgerEntry.create({
        id: this.ledger.nextId(),
        scope: "org",
        ownerId: input.organizationId,
        actorUserId: input.actorUserId,
        walletId: wallet.id,
        walletSource: wallet.source,
        type: "credit",
        amount: input.amount,
        reason: "admin_grant",
        metadata,
      });
      await this.ledger.save(entry);

      return { delta: input.amount };
    }

    const toDebit = -input.amount;
    try {
      await this.debitCredits.execute({
        ownerId: input.organizationId,
        scope: "org",
        actorUserId: input.actorUserId,
        amount: toDebit,
        reason: "adjustment",
        metadata,
      });
    } catch (err) {
      if (err instanceof InsufficientCreditsError) throw err;
      throw err;
    }

    return { delta: input.amount };
  }
}
