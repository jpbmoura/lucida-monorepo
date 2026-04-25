import { getStripeClient } from "../infrastructure/stripe/stripe-client.js";
import { planToStripePriceId } from "../infrastructure/stripe/plan-price-mapping.js";
import type { SubscriptionRepository } from "../domain/subscription-repository.js";
import type { PlanId } from "../domain/plan.js";
import { getPlan } from "../domain/plan.js";

interface Input {
  ownerId: string;
  ownerEmail: string;
  ownerName: string | null;
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
      // Se já existe um Customer, reusa. Senão Stripe cria um com o email
      // passado em customer_email.
      ...(existingCustomer
        ? { customer: existingCustomer }
        : { customer_email: input.ownerEmail }),
      metadata: {
        ownerId: input.ownerId,
        planId: input.planId,
      },
      subscription_data: {
        metadata: {
          ownerId: input.ownerId,
          planId: input.planId,
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
