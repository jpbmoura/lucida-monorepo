import type { LedgerEntry } from "./ledger-entry.js";
import type { LedgerEntryId } from "./ledger-entry-id.js";
import type { BillingScope } from "./billing-scope.js";

export interface LedgerRepository {
  nextId(): LedgerEntryId;
  save(entry: LedgerEntry): Promise<void>;
  /**
   * Extrato do dono em ordem reversa de tempo (mais recente primeiro).
   * Limit default é intencionalmente baixo — UI pagina com `before`.
   *
   * `scope` default `"user"` mantém retrocompat dos callers existentes.
   * Para ver ledger da organização, passar `"org"`.
   */
  findByOwner(input: {
    ownerId: string;
    scope?: BillingScope;
    limit: number;
    before?: Date;
  }): Promise<LedgerEntry[]>;
}
