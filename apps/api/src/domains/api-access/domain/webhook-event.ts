/**
 * Eventos que a Lucida dispara pra endpoints de webhook cadastrados. A
 * lista é fechada — adicionar novo evento exige atualizar o emitter no
 * domain que o origina (Fase C) + este enum.
 */
export type WebhookEvent =
  | "submission.created"
  | "submission.scored"
  | "exam.published"
  | "exam.updated"
  | "class.created"
  | "student.enrolled";

export const ALL_WEBHOOK_EVENTS: readonly WebhookEvent[] = [
  "submission.created",
  "submission.scored",
  "exam.published",
  "exam.updated",
  "class.created",
  "student.enrolled",
] as const;

export function isWebhookEvent(value: string): value is WebhookEvent {
  return (ALL_WEBHOOK_EVENTS as readonly string[]).includes(value);
}
