import { WebhookEventModel } from "./webhook-event-schema.js";

/**
 * Marca o event.id como processado. Retorna true se era novo (primeira vez),
 * false se já tinha sido processado — nesse caso o caller deve ignorar.
 *
 * Usa insert com unique _id: race condition entre dois workers fica resolvida
 * — o segundo recebe E11000 e a gente retorna false.
 */
export async function markEventProcessed(input: {
  eventId: string;
  eventType: string;
}): Promise<{ isNew: boolean }> {
  try {
    await WebhookEventModel.create({
      _id: input.eventId,
      type: input.eventType,
      processedAt: new Date(),
    });
    return { isNew: true };
  } catch (err: unknown) {
    // E11000 = duplicate key — evento já processado, seguro ignorar.
    if (isDuplicateKeyError(err)) {
      return { isNew: false };
    }
    throw err;
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}
