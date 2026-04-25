/**
 * Escopo do "dono" de uma wallet/ledger entry.
 *
 * - `"user"` — carteira/lançamento pessoal (avulso ou member em modo
 *   per_teacher). `ownerId` é o hex do `user._id` do BA.
 * - `"org"` — carteira/lançamento da organização (modo pool ou o ledger
 *   consolidado de pay_per_use). `ownerId` é o hex do `organization._id`.
 *
 * Default em docs existentes (antes da migração institucional) é `"user"`.
 */
export type BillingScope = "user" | "org";
