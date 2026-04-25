import type { CreditWallet } from "./credit-wallet.js";
import type { WalletId } from "./wallet-id.js";
import type { CreditSource } from "./credit-source.js";
import type { BillingScope } from "./billing-scope.js";

export interface WalletRepository {
  nextId(): WalletId;
  save(wallet: CreditWallet): Promise<void>;
  findById(id: WalletId): Promise<CreditWallet | null>;
  /**
   * Carteiras ativas (saldo > 0 e não expiradas) do dono — ordenadas por
   * prioridade de consumo (expira antes → gasta antes) e, em empate, por
   * createdAt (mais antigas primeiro).
   *
   * `scope` default `"user"` pra manter retrocompat dos callers existentes.
   * Institutional (pool) passa `"org"`.
   */
  findActiveByOwner(
    ownerId: string,
    scope?: BillingScope,
  ): Promise<CreditWallet[]>;
  findAllByOwner(
    ownerId: string,
    scope?: BillingScope,
  ): Promise<CreditWallet[]>;
  findByOwnerAndSource(
    ownerId: string,
    source: CreditSource,
    scope?: BillingScope,
  ): Promise<CreditWallet[]>;
}
