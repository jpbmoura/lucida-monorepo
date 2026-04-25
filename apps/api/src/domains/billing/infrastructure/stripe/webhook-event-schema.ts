import mongoose, { Schema, type Model } from "mongoose";

/**
 * Registro de eventos Stripe já processados. Pra idempotência — Stripe
 * retenta webhooks em caso de timeout/5xx, e a gente processa cada evento
 * só uma vez.
 *
 * TTL de 30 dias: Stripe só retenta por alguns dias, depois é seguro esquecer.
 */
export interface WebhookEventDoc {
  _id: string; // event.id do Stripe (evt_xxx)
  type: string;
  processedAt: Date;
}

const webhookEventSchema = new Schema<WebhookEventDoc>(
  {
    _id: { type: String, required: true },
    type: { type: String, required: true },
    processedAt: { type: Date, required: true },
  },
  {
    collection: "stripe_webhook_events",
    _id: false,
    versionKey: false,
    timestamps: false,
  },
);

// Auto-remoção após 30 dias.
webhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const WebhookEventModel: Model<WebhookEventDoc> =
  (mongoose.models.StripeWebhookEvent as Model<WebhookEventDoc> | undefined) ??
  mongoose.model<WebhookEventDoc>("StripeWebhookEvent", webhookEventSchema);
