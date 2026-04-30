import { z } from "zod";

/**
 * Shape do webhook Resend Inbound. A doc deles ainda evolui — usamos
 * passthrough no objeto raiz e validamos só o que precisamos.
 *
 * Tolerante a variações: `to` pode vir como string, array de strings,
 * ou array de `{address, name}`. Headers podem ser estruturados ou
 * uma string raw — passthrough cobre.
 */

const stringOrAddressArray = z
  .union([
    z.string(),
    z.array(z.string()),
    z.array(
      z
        .object({
          address: z.string().optional(),
          name: z.string().nullish(),
        })
        .passthrough(),
    ),
  ])
  .transform((v): string[] => {
    if (typeof v === "string") return [v];
    if (Array.isArray(v)) {
      return v
        .map((item) =>
          typeof item === "string" ? item : (item.address ?? ""),
        )
        .filter((s): s is string => s.length > 0);
    }
    return [];
  });

const attachmentSchema = z
  .object({
    filename: z.string().min(1),
    contentType: z.string().min(1).optional(),
    content_type: z.string().min(1).optional(),
    size: z.number().int().nonnegative().optional(),
    url: z.string().url().optional(),
  })
  .passthrough()
  .transform((a) => ({
    filename: a.filename,
    contentType: a.contentType ?? a.content_type ?? "application/octet-stream",
    size: a.size ?? 0,
    providerUrl: a.url ?? null,
  }));

export const resendInboundEventSchema = z
  .object({
    type: z.string().optional(),
    data: z
      .object({
        id: z.string().optional(),
        from: z.string().min(1),
        to: stringOrAddressArray,
        subject: z.string().nullish().transform((s) => s ?? ""),
        text: z.string().nullish(),
        html: z.string().nullish(),
        // Headers podem vir como objeto ou ausentes. Tratamos como
        // record permissivo e extraímos o que precisamos.
        headers: z.record(z.unknown()).nullish(),
        // Algumas versões expõem Message-ID/In-Reply-To no top-level
        // direto, em vez de dentro de headers.
        message_id: z.string().optional(),
        messageId: z.string().optional(),
        in_reply_to: z.string().optional(),
        inReplyTo: z.string().optional(),
        attachments: z.array(attachmentSchema).optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type ResendInboundEvent = z.infer<typeof resendInboundEventSchema>;

/** Extrai Message-ID do payload, tentando múltiplos caminhos. */
export function extractMessageId(event: ResendInboundEvent): string | null {
  const data = event.data;
  if (data.message_id) return data.message_id;
  if (data.messageId) return data.messageId;
  const headers = data.headers ?? {};
  const candidates = ["Message-ID", "Message-Id", "message-id"];
  for (const k of candidates) {
    const v = headers[k];
    if (typeof v === "string") return v;
  }
  return null;
}

/** Extrai In-Reply-To, tentando múltiplos caminhos. */
export function extractInReplyTo(event: ResendInboundEvent): string | null {
  const data = event.data;
  if (data.in_reply_to) return data.in_reply_to;
  if (data.inReplyTo) return data.inReplyTo;
  const headers = data.headers ?? {};
  const candidates = ["In-Reply-To", "in-reply-to"];
  for (const k of candidates) {
    const v = headers[k];
    if (typeof v === "string") return v;
  }
  return null;
}
