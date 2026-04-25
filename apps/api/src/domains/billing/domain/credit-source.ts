/**
 * Origem dos créditos. Determina:
 * - Prioridade de consumo (mais prioritário = gastar antes).
 * - Política de expiração (subscription expira no fim do ciclo, welcome nunca).
 * - Tratamento em renewals (subscription é zerada; outros permanecem).
 *
 * Fontes `user` (wallet pessoal): subscription, topup, welcome, promo.
 * Fontes `org` (wallet institucional): `admin_grant` (injeção manual via
 * script até termos Stripe institucional). Futuras: `subscription_org`,
 * `topup_org`.
 */
export type CreditSource =
  | "subscription"
  | "topup"
  | "welcome"
  | "promo"
  | "admin_grant";

/**
 * Ordem de consumo (menor = gasta primeiro). Pensada pra proteger o usuário:
 * o que expira antes vai embora primeiro.
 */
export const CREDIT_SOURCE_PRIORITY: Record<CreditSource, number> = {
  subscription: 0,
  topup: 1,
  admin_grant: 1,
  promo: 2,
  welcome: 3,
};
