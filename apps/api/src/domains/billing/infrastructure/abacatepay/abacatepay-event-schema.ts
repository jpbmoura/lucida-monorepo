import { z } from "zod";

/**
 * Webhook payload v2 da AbacatePay. Baseado em
 * https://docs.abacatepay.com/pages/webhooks/events/transparent.md
 *
 * Estrutura essencial (`apiVersion: 2`):
 *
 *   {
 *     "event": "transparent.completed",
 *     "apiVersion": 2,
 *     "devMode": false,
 *     "data": {
 *       "transparent": {
 *         "id": "char_xyz789",
 *         "amount": 5000,
 *         "paidAmount": 5000,
 *         "status": "PAID",
 *         "methods": ["PIX"],
 *         "createdAt": "...",
 *         "updatedAt": "..."
 *       },
 *       "customer": { "id": "...", "name": "...", "email": "...", "taxId": "..." },
 *       "payerInformation": { ... }
 *     }
 *   }
 *
 * Como ainda não temos um identificador estável para "id do evento" do
 * payload v2 (o `data.transparent.id` é da cobrança, não do evento), a
 * idempotência cai numa chave composta `<event>:<transparentId>:<status>`
 * — ver `webhook-idempotency.ts`.
 */

const transparentDataSchema = z
  .object({
    id: z.string().min(1),
    amount: z.number().int(),
    paidAmount: z.number().int().optional(),
    status: z.string().min(1),
    methods: z.array(z.string()).optional(),
    devMode: z.boolean().optional(),
    receiptUrl: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

const customerDataSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    taxId: z.string().optional(),
  })
  .passthrough();

export const abacatePayEventSchema = z
  .object({
    event: z.string().min(1),
    apiVersion: z.number().optional(),
    devMode: z.boolean().optional(),
    data: z
      .object({
        transparent: transparentDataSchema.optional(),
        customer: customerDataSchema.optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type AbacatePayEvent = z.infer<typeof abacatePayEventSchema>;
