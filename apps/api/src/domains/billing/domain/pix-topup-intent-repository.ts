import type { PixTopupIntent } from "./pix-topup-intent.js";

export interface PixTopupIntentRepository {
  save(intent: PixTopupIntent): Promise<void>;
  findByAbacateId(abacateId: string): Promise<PixTopupIntent | null>;
  /**
   * Lookup com gating de ownership — usado nos endpoints autenticados pra
   * o user só conseguir ver o status do PIX dele mesmo. Repositório fica
   * responsável; use case não precisa saber se é uma query separada ou
   * filter in-memory.
   */
  findByAbacateIdAndOwner(
    abacateId: string,
    ownerId: string,
  ): Promise<PixTopupIntent | null>;
}
