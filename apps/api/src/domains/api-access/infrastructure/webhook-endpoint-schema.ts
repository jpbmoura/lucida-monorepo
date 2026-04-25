import mongoose, { Schema, type Model } from "mongoose";
import { ALL_WEBHOOK_EVENTS } from "../domain/webhook-event.js";

export interface WebhookEndpointDoc {
  _id: string;
  organizationId: string;
  url: string;
  environment: "live" | "test";
  events: string[];
  /**
   * Plaintext — precisamos pra assinar disparos na Fase C. Proteção em
   * profundidade: acesso ao banco já é gated por infra; docs com esse
   * campo nunca são enviados pra UI em listagens.
   */
  signingSecret: string;
  enabled: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

const webhookEndpointSchema = new Schema<WebhookEndpointDoc>(
  {
    _id: { type: String, required: true },
    organizationId: { type: String, required: true, index: true },
    url: { type: String, required: true, maxlength: 2048 },
    environment: { type: String, required: true, enum: ["live", "test"] },
    events: {
      type: [String],
      required: true,
      default: [],
      validate: {
        validator: (arr: string[]) =>
          arr.every((e) => (ALL_WEBHOOK_EVENTS as readonly string[]).includes(e)),
        message: "Evento inválido em webhookEndpoint.events",
      },
    },
    signingSecret: { type: String, required: true },
    enabled: { type: Boolean, required: true, default: true },
    createdByUserId: { type: String, required: true },
  },
  {
    collection: "webhook_endpoints",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

webhookEndpointSchema.index({ organizationId: 1, environment: 1, createdAt: -1 });

export const WebhookEndpointModel: Model<WebhookEndpointDoc> =
  (mongoose.models.WebhookEndpoint as Model<WebhookEndpointDoc> | undefined) ??
  mongoose.model<WebhookEndpointDoc>(
    "WebhookEndpoint",
    webhookEndpointSchema,
  );
