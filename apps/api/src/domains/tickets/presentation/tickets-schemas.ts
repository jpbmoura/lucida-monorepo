import { z } from "zod";

export const listTicketsQuery = z.object({
  status: z.enum(["new", "in_progress", "done", "read"]).optional(),
  box: z.enum(["inbox", "outbox"]).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  before: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export const bulkUpdateStatusBody = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "Selecione pelo menos um email.")
    .max(200, "Máximo 200 itens por chamada."),
  status: z.enum(["in_progress", "done", "read"]),
});

export const ticketIdParam = z.object({
  id: z.string().min(1),
});

export const replyBody = z.object({
  bodyText: z.string().min(1, "Mensagem não pode ser vazia.").max(10_000),
});

export const composeBody = z.object({
  customerEmail: z
    .string()
    .min(1, "Email do destinatário é obrigatório.")
    .email("Email inválido.")
    .max(320),
  customerName: z.string().max(120).optional().nullable(),
  subject: z
    .string()
    .min(1, "Assunto é obrigatório.")
    .max(200),
  bodyText: z
    .string()
    .min(1, "Mensagem não pode ser vazia.")
    .max(10_000),
});
