import { getStripeClient } from "../infrastructure/stripe/stripe-client.js";
import { topupToStripePriceId } from "../infrastructure/stripe/topup-price-mapping.js";
import type { SubscriptionRepository } from "../domain/subscription-repository.js";
import { getTopup, type TopupId } from "../domain/topup.js";
import { TaxIdRequiredError } from "../domain/billing-errors.js";

interface Input {
  ownerId: string;
  ownerEmail: string;
  /**
   * CPF/CNPJ só dígitos. Obrigatório por consistência com o caminho PIX —
   * a coleta passa a ser uniforme em todo checkout.
   */
  taxId: string;
  topupId: TopupId;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateTopupCheckoutOutput {
  url: string;
}

/**
 * Cria Stripe Checkout em mode="payment" (compra única) pro pacote avulso.
 * Metadata.type="topup" + metadata.topupId permitem o webhook identificar
 * o tipo de pagamento e creditar a wallet correta.
 */
export class CreateTopupCheckoutSessionUseCase {
  constructor(private readonly subscriptions: SubscriptionRepository) {}

  async execute(input: Input): Promise<CreateTopupCheckoutOutput> {
    if (!isValidTaxId(input.taxId)) {
      throw new TaxIdRequiredError();
    }

    const stripe = getStripeClient();
    const topup = getTopup(input.topupId);
    const priceId = topupToStripePriceId(input.topupId);

    // Reusa customer se existir — permite manter histórico consolidado no Stripe.
    const existingCustomer = await this.subscriptions.findStripeCustomerByOwner(
      input.ownerId,
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.ownerId,
      ...(existingCustomer
        ? { customer: existingCustomer }
        : { customer_email: input.ownerEmail }),
      // payment_intent_data.metadata NÃO é o caminho — o webhook de
      // checkout.session.completed lê direto de session.metadata.
      metadata: {
        type: "topup",
        ownerId: input.ownerId,
        topupId: input.topupId,
        credits: String(topup.credits),
        taxId: input.taxId,
      },
      // Pra PJ: NFe pedida no portal depois. Por enquanto deixa o Stripe
      // só capturar o e-mail/CNPJ via collect_tax se habilitado na conta.
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
