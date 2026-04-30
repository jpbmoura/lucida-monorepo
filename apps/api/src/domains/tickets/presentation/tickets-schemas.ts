import { z } from "zod";

export const listTicketsQuery = z.object({
  kind: z.enum(["support", "general"]).optional(),
  status: z.enum(["open", "closed"]).optional(),
  /** Filtro pra caixa de entrada — só "não lidos por mim". */
  unreadOnly: z
    .union([z.literal("true"), z.literal("1")])
    .optional()
    .transform((v) => Boolean(v)),
  limit: z.coerce.number().int().positive().max(200).optional(),
  before: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export const ticketIdParam = z.object({
  id: z.string().min(1),
});

export const replyBody = z.object({
  bodyText: z.string().min(1, "Mensagem não pode ser vazia.").max(10_000),
});
