import { createHmac, randomBytes } from "node:crypto";
import type {
  ApiKeyGenerator,
  GeneratedApiKey,
  WebhookSecretGenerator,
} from "../domain/key-generator.js";
import type { ApiKeyEnvironment } from "../domain/api-key-environment.js";

/**
 * Gera chaves no formato `lucida_{env}_sk_{base64url(32 bytes)}`. O hash
 * guardado no banco é HMAC-SHA256 do plaintext com `AUTH_SECRET` —
 * defesa em profundidade: dump do banco não permite brute-force sem
 * também ter o secret da app.
 *
 * O middleware público (Fase B) vai computar o mesmo HMAC no Bearer
 * recebido e fazer lookup pelo hash — lookup em O(1) via índice único
 * em `keyHash`.
 */
export class HmacApiKeyGenerator implements ApiKeyGenerator {
  constructor(private readonly authSecret: string) {}

  generate(environment: ApiKeyEnvironment): GeneratedApiKey {
    const random = randomBytes(32).toString("base64url");
    const plaintext = `lucida_${environment}_sk_${random}`;
    const hash = createHmac("sha256", this.authSecret)
      .update(plaintext)
      .digest("hex");
    const lastFour = random.slice(-4);
    return { plaintext, lastFour, hash };
  }
}

/**
 * Gera 32 bytes aleatórios em base64url pra signing secret de webhook.
 * O secret é guardado plaintext (precisamos dele pra assinar outbound),
 * então o único controle é entropia alta + reveal-once.
 */
export class RandomWebhookSecretGenerator implements WebhookSecretGenerator {
  generate(): string {
    return randomBytes(32).toString("base64url");
  }
}
