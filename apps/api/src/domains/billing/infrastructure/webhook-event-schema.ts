import mongoose, { Schema, type Model } from "mongoose";

/**
 * Registro de eventos de webhook já processados — idempotência cross-provider.
 *
 * O `_id` é prefixado por provider (`stripe:evt_xxx`, `abacate:transparent.completed:char_yyy:PAID`)
 * pra evitar colisão no espaço de IDs e deixar claro de onde veio a entrada.
 *
 * TTL de 30 dias: tanto Stripe quanto AbacatePay limitam retries a poucos
 * dias; depois disso é seguro esquecer.
 */
export interface WebhookEventDoc {
  _id: string;
  provider: "stripe" | "abacatepay";
  type: string;
  processedAt: Date;
}

const webhookEventSchema = new Schema<WebhookEventDoc>(
  {
    _id: { type: String, required: true },
    provider: { type: String, required: true },
    type: { type: String, required: true },
    processedAt: { type: Date, required: true },
  },
  {
    // Mantém o nome legacy `stripe_webhook_events` pra não quebrar entries
    // já gravados pelo Stripe — o prefixo no _id segue cobrindo a separação
    // semântica e os documentos antigos continuam válidos (provider default
    // tratado como stripe pelo handler).
    collection: "stripe_webhook_events",
    _id: false,
    versionKey: false,
    timestamps: false,
  },
);

webhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const WebhookEventModel: Model<WebhookEventDoc> =
  (mongoose.models.StripeWebhookEvent as Model<WebhookEventDoc> | undefined) ??
  mongoose.model<WebhookEventDoc>("StripeWebhookEvent", webhookEventSchema);
