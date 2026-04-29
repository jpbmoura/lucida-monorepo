import { z } from "zod";

/**
 * Shape do webhook do NFE.io. A doc varia entre versões — usamos
 * passthrough no objeto raiz pra tolerar campos extras e validamos só
 * o que precisamos pra atualizar a Invoice.
 *
 * Type pode vir como `ServiceInvoice.Issued` / `.Cancelled` / `.Failed`
 * (eventos por estado) ou apenas `serviceInvoice` em versões mais novas
 * com discriminador via `data.flowStatus`. A gente trata pelo flowStatus
 * — é o que carrega a verdade.
 */
export const nfeIoEventSchema = z
  .object({
    /** Identificador único do evento — vira chave de idempotência. */
    id: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    companyId: z.string().min(1).optional(),
    /** Recurso da nota — mesmo shape de `getInvoice`. */
    data: z
      .object({
        id: z.string().min(1),
        flowStatus: z.string().min(1),
        pdfUrl: z.string().url().nullish(),
        xmlUrl: z.string().url().nullish(),
        rpsNumber: z.union([z.number(), z.string()]).nullish(),
        rpsSerialNumber: z.string().nullish(),
        flowMessage: z.string().nullish(),
      })
      .passthrough(),
  })
  .passthrough();

export type NfeIoEvent = z.infer<typeof nfeIoEventSchema>;
