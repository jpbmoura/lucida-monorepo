import { z } from "zod";

export const apiKeyIdParam = z.object({ id: z.string().min(1) });
export const webhookIdParam = z.object({ id: z.string().min(1) });

export const createApiKeyBody = z.object({
  name: z.string().trim().min(1, "Dê um nome pra identificar a chave.").max(80),
  environment: z.enum(["live", "test"]),
  scopes: z.array(z.string()).default([]),
});

export const createWebhookEndpointBody = z.object({
  url: z.string().trim().min(1, "URL é obrigatória.").max(2048),
  environment: z.enum(["live", "test"]),
  events: z.array(z.string()).min(0),
});

export const updateWebhookEndpointBody = z
  .object({
    url: z.string().trim().min(1).max(2048).optional(),
    events: z.array(z.string()).optional(),
    enabled: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.url !== undefined || v.events !== undefined || v.enabled !== undefined,
    { message: "Informe pelo menos um campo pra atualizar." },
  );
