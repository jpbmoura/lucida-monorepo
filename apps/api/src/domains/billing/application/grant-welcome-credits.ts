import type { WalletRepository } from "../domain/wallet-repository.js";
import type { LedgerRepository } from "../domain/ledger-repository.js";
import { CreditWallet } from "../domain/credit-wallet.js";
import { LedgerEntry } from "../domain/ledger-entry.js";

interface Input {
  ownerId: string;
  amount: number;
}

/**
 * Cria a carteira de boas-vindas do usuário recém-cadastrado.
 * Idempotente: se já existe carteira welcome pro owner, não faz nada —
 * evita duplicar o bônus em caso de retry do hook ou dupla inscrição.
 */
export class GrantWelcomeCreditsUseCase {
  constructor(
    private readonly wallets: WalletRepository,
    private readonly ledger: LedgerRepository,
  ) {}

  async execute(input: Input): Promise<void> {
    const existing = await this.wallets.findByOwnerAndSource(
      input.ownerId,
      "welcome",
    );
    if (existing.length > 0) return;

    const wallet = CreditWallet.create({
      id: this.wallets.nextId(),
      ownerId: input.ownerId,
      source: "welcome",
      initialBalance: input.amount,
      expiresAt: null, // boas-vindas não expiram
    });
    await this.wallets.save(wallet);

    const entry = LedgerEntry.create({
      id: this.ledger.nextId(),
      ownerId: input.ownerId,
      walletId: wallet.id,
      walletSource: wallet.source,
      type: "credit",
      amount: input.amount,
      reason: "welcome_bonus",
      metadata: { description: "Bônus de boas-vindas" },
    });
    await this.ledger.save(entry);
  }
}
