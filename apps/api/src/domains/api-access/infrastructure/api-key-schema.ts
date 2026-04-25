import mongoose, { Schema, type Model } from "mongoose";
import { ALL_API_KEY_SCOPES } from "../domain/api-key-scope.js";

export interface ApiKeyDoc {
  _id: string;
  organizationId: string;
  name: string;
  environment: "live" | "test";
  scopes: string[];
  /** HMAC-SHA256(plaintext, AUTH_SECRET), hex. Único no banco. */
  keyHash: string;
  /** Últimos 4 chars do plaintext — seguro exibir na UI. */
  keyLastFour: string;
  createdByUserId: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<ApiKeyDoc>(
  {
    _id: { type: String, required: true },
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    environment: { type: String, required: true, enum: ["live", "test"] },
    scopes: {
      type: [String],
      required: true,
      default: [],
      // Validação de domínio repetida aqui por defesa — use case é a
      // fonte da verdade, mas schema pega inserts que escapem.
      validate: {
        validator: (arr: string[]) =>
          arr.every((s) => (ALL_API_KEY_SCOPES as readonly string[]).includes(s)),
        message: "Scope inválido em apiKey.scopes",
      },
    },
    keyHash: { type: String, required: true, unique: true },
    keyLastFour: { type: String, required: true, maxlength: 8 },
    createdByUserId: { type: String, required: true },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null, index: true },
  },
  {
    collection: "api_keys",
    timestamps: true,
    _id: false,
    versionKey: false,
  },
);

// Lookup principal da UI: keys ativas da org ordenadas por createdAt.
apiKeySchema.index({ organizationId: 1, revokedAt: 1, createdAt: -1 });

export const ApiKeyModel: Model<ApiKeyDoc> =
  (mongoose.models.ApiKey as Model<ApiKeyDoc> | undefined) ??
  mongoose.model<ApiKeyDoc>("ApiKey", apiKeySchema);
