/**
 * Modelos de cobrança suportados pra uma organização.
 *
 * - `pool` — pré-pago. A org compra créditos; todos os members consomem
 *   do mesmo pote (mode "estrito": wallet pessoal fica congelada).
 * - `per_teacher` — pré-pago. Cada member recebe um limite mensal pelo
 *   plano da org, debita da wallet pessoal seeded institucionalmente.
 *   Reservado no schema; UI mostra como "em breve".
 * - `pay_per_use` — pós-pago. Consumo é livre; sistema acumula no ledger
 *   e emite fatura periódica via Stripe. Reservado no schema.
 * - `unlimited` — cortesia / acordo fora-da-plataforma. A org tem acesso
 *   completo sem checagem de saldo, mas o consumo continua sendo gravado
 *   no ledger pra auditoria. Atribuído manualmente via Kintal.
 */
export type OrgBillingMode =
  | "pool"
  | "per_teacher"
  | "pay_per_use"
  | "unlimited";
