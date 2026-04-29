/**
 * De onde a Invoice se origina — dita como o externalRef é construído
 * e é útil pra debug + filtros na UI.
 *
 *  - subscription:  `invoice.payment_succeeded` do Stripe (cobrança recorrente).
 *                   externalRef = `stripe:invoice:{stripe_invoice.id}`.
 *  - topup_stripe:  `checkout.session.completed` mode=payment do Stripe.
 *                   externalRef = `stripe:session:{session.id}`.
 *  - topup_pix:     `transparent.completed` da AbacatePay (PIX confirmado).
 *                   externalRef = `abacate:{abacateId}`.
 */
export type InvoiceSource = "subscription" | "topup_stripe" | "topup_pix";
