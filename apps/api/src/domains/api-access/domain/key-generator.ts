import type { ApiKeyEnvironment } from "./api-key-environment.js";

export interface GeneratedApiKey {
  /**
   * Plaintext completo no formato `lucida_{env}_sk_{base64url}`. Mostrado
   * uma única vez ao usuário na UI — o backend não deve logar este valor.
   */
  plaintext: string;
  /** Últimos 4 chars da porção aleatória — seguro pra persistir/exibir. */
  lastFour: string;
  /** HMAC do plaintext com `AUTH_SECRET`, em hex — vai pro DB. */
  hash: string;
}

/**
 * Gera plaintext + hash de uma chave nova. Implementações devem usar RNG
 * criptograficamente seguro (não `Math.random`). A semântica do hash
 * (ex: HMAC-SHA256) é responsabilidade do adapter, mas precisa bater com
 * o que o middleware público (Fase B) vai usar pra verificar.
 */
export interface ApiKeyGenerator {
  generate(environment: ApiKeyEnvironment): GeneratedApiKey;
}

/**
 * Gera um signing secret aleatório pra endpoint de webhook. Formato é
 * base64url (URL-safe) com entropia suficiente pra HMAC-SHA256 resistir
 * a brute-force. Não há hash no DB — precisamos do plaintext pra
 * assinar payloads outbound (Fase C).
 */
export interface WebhookSecretGenerator {
  generate(): string;
}
