import type { TakerSnapshot } from "../domain/taker-snapshot.js";

export interface ResolveTakerInput {
  /** User que iniciou o pagamento. Sempre preenchido. */
  ownerId: string;
  /**
   * Email de contato. Pra tomador = user, é ignorado (resolver lê do
   * doc do user). Pra tomador = org, é usado como contato fiscal —
   * org não tem email próprio no schema atual.
   */
  ownerEmail: string;
  /** Quando set, tomador = org (cobrança institucional). */
  organizationId?: string | null;
}

/**
 * Constrói o `TakerSnapshot` lendo os dados fiscais do user ou da org.
 *
 *  - Tomador = user: lê CPF/CNPJ + nome + endereço do user (additionalFields
 *    no BetterAuth). PF: CPF + nome + email basta. PJ: razão social +
 *    endereço completo obrigatórios.
 *  - Tomador = org: lê CNPJ + razão social + endereço da org. Email do
 *    contato vem do `ownerEmail` (org não tem email).
 *
 * Retorna null quando dados estão incompletos. Caller decide o que
 * fazer (geralmente: log + skip pra não bloquear o webhook).
 */
export interface TakerResolver {
  resolve(input: ResolveTakerInput): Promise<TakerSnapshot | null>;
}
