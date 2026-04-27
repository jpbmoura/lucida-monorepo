/**
 * Port pra envio HTTP de webhooks. Isolado pra que o use case do
 * dispatch seja testável sem mockar fetch globalmente — basta uma
 * implementação fake.
 */

export interface OutboundWebhookRequest {
  url: string;
  /** Corpo cru (string já serializada) — preserva ordem das chaves
   * pra que a assinatura do receiver bate na verificação. */
  body: string;
  /** Headers já preparados (Content-Type, X-Lucida-Signature, etc). */
  headers: Record<string, string>;
  /** Timeout em ms. Default no implementador. */
  timeoutMs?: number;
}

export interface OutboundWebhookResult {
  ok: boolean;
  /** HTTP status — 0 quando não houve resposta (timeout, DNS, etc). */
  status: number;
  /** Mensagem livre pra log; não exibida ao cliente da API. */
  message?: string;
}

export interface WebhookEventSender {
  send(request: OutboundWebhookRequest): Promise<OutboundWebhookResult>;
}
