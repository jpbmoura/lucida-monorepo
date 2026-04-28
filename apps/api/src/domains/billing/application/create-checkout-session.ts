import { getStripeClient } from "../infrastructure/stripe/stripe-client.js";
import { planToStripePriceId } from "../infrastructure/stripe/plan-price-mapping.js";
import type { SubscriptionRepository } from "../domain/subscription-repository.js";
import type { PlanId } from "../domain/plan.js";
import { getPlan } from "../domain/plan.js";
import { TaxIdRequiredError } from "../domain/billing-errors.js";

interface Input {
  ownerId: string;
  ownerEmail: string;
  ownerName: string | null;
  /**
   * CPF (11 dígitos) ou CNPJ (14 dígitos), só dígitos. Obrigatório pra
   * padronizar a coleta entre Stripe (cartão) e AbacatePay (PIX), já que
   * o PIX exige `customer.taxId`. Vai pro Stripe via `customer_data.tax_id_data`
   * pra aparecer no recibo/NFe.
   */
  taxId: string;
  planId: PlanId;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutOutput {
  url: string;
}

/**
 * Cria uma Stripe Checkout Session (modo subscription). Reusa o Stripe
 * Customer do user se ele já tinha assinado antes; senão, pede pro Stripe
 * criar um com o e-mail dele.
 *
 * Metadata.ownerId é o que a gente usa no webhook pra amarrar o event de
 * volta ao user — Stripe não conhece nosso ownerId, só o Customer.
 */
export class CreateCheckoutSessionUseCase {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async execute(input: Input): Promise<CreateCheckoutOutput> {
    if (!isValidTaxId(input.taxId)) {
      throw new TaxIdRequiredError();
    }

    const stripe = getStripeClient();
    const plan = getPlan(input.planId);
    const priceId = planToStripePriceId(input.planId);

    const existingCustomer = await this.subscriptions.findStripeCustomerByOwner(
      input.ownerId,
    );

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.ownerId,
      ...(existingCustomer
        ? { customer: existingCustomer }
        : { customer_email: input.ownerEmail }),
      metadata: {
        ownerId: input.ownerId,
        planId: input.planId,
        taxId: input.taxId,
      },
      subscription_data: {
        metadata: {
          ownerId: input.ownerId,
          planId: input.planId,
          taxId: input.taxId,
        },
        description: `${plan.name} — ${input.ownerName ?? input.ownerEmail}`,
      },
      allow_promotion_codes: true,
      locale: "pt-BR",
    });

    if (!session.url) {
      throw new Error("Stripe não retornou URL de checkout.");
    }
    return { url: session.url };
  }
}

function isValidTaxId(value: string): boolean {
  return /^\d{11}$|^\d{14}$/.test(value);
}
