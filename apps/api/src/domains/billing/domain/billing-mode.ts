/**
 * Modelos de cobrança suportados pra uma organização. Apenas `pool`
 * está implementado no MVP; os outros estão reservados no schema e
 * visíveis na UI como "em breve" pra não precisar de migração depois.
 *
 * - `pool` — pré-pago. A org compra créditos; todos os members consomem
 *   do mesmo pote (mode "estrito": wallet pessoal fica congelada).
 * - `per_teacher` — pré-pago. Cada member recebe um limite mensal pelo
 *   plano da org, debita da wallet pessoal seeded institucionalmente.
 * - `pay_per_use` — pós-pago. Consumo é livre; sistema acumula no ledger
 *   e emite fatura periódica via Stripe.
 */
export type OrgBillingMode = "pool" | "per_teacher" | "pay_per_use";
