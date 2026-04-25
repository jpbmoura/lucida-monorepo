import { getStripeClient } from "../infrastructure/stripe/stripe-client.js";
import type { SubscriptionRepository } from "../domain/subscription-repository.js";
import { DomainError } from "@/shared/errors/domain-error.js";

class NoSubscriptionError extends DomainError {
  readonly code = "NO_SUBSCRIPTION";
  readonly statusCode = 404;
  constructor() {
    super("Você não tem uma assinatura ativa pra gerenciar.");
  }
}

interface Input {
  ownerId: string;
  returnUrl: string;
}

export interface CreatePortalOutput {
  url: string;
}

/**
 * Abre o Stripe Customer Portal — self-service pra cancelar, trocar método
 * de pagamento, ver invoices e fazer upgrade/downgrade.
 */
export class CreatePortalSessionUseCase {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async execute(input: Input): Promise<CreatePortalOutput> {
    const customerId = await this.subscriptions.findStripeCustomerByOwner(
      input.ownerId,
    );
    if (!customerId) {
      throw new NoSubscriptionError();
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: input.returnUrl,
      locale: "pt-BR",
    });
    return { url: session.url };
  }
}

export { NoSubscriptionError };
