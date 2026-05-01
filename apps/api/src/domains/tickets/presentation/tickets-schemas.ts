import { z } from "zod";

export const listTicketsQuery = z.object({
  status: z.enum(["new", "in_progress", "done"]).optional(),
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
