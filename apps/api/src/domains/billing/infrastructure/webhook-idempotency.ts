import { WebhookEventModel } from "./webhook-event-schema.js";

/**
 * Marca um evento como processado de forma atômica. Retorna `isNew: true`
 * só na primeira chamada — o caller deve descartar processamentos
 * subsequentes.
 *
 * Race condition entre dois workers vira E11000 (duplicate key) e a
 * gente devolve `isNew: false` sem erro.
 *
 * Provider e eventKey são concatenados em `provider:eventKey` pra evitar
 * colisão entre Stripe (`evt_xxx`) e AbacatePay (que não tem ID estável
 * de evento — usa-se uma chave composta como `transparent.completed:char_yyy:PAID`).
 */
export async function markEventProcessed(input: {
  provider: "stripe" | "abacatepay" | "nfeio";
  eventKey: string;
  eventType: string;
}): Promise<{ isNew: boolean }> {
  const id = `${input.provider}:${input.eventKey}`;
  try {
    await WebhookEventModel.create({
      _id: id,
      provider: input.provider,
      type: input.eventType,
      processedAt: new Date(),
    });
    return { isNew: true };
  } catch (err: unknown) {
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
