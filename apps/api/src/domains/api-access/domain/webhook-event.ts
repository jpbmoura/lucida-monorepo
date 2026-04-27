/**
 * Eventos que a Lucida dispara pra endpoints de webhook cadastrados.
 * Lista fechada — adicionar evento novo exige atualizar o emitter no
 * domain que o origina + este enum.
 */
export type WebhookEvent = "submission.completed";

export const ALL_WEBHOOK_EVENTS: readonly WebhookEvent[] = [
  "submission.completed",
] as const;

export function isWebhookEvent(value: string): value is WebhookEvent {
  return (ALL_WEBHOOK_EVENTS as readonly string[]).includes(value);
}
