import { z } from "zod";

export const ledgerQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.coerce.date().optional(),
});

export const checkoutBody = z.object({
  planId: z.enum([
    "basic_monthly",
    "basic_yearly",
    "pro_monthly",
    "pro_yearly",
  ]),
});

export const topupBody = z.object({
  topupId: z.enum(["topup_2k", "topup_5k", "topup_15k"]),
});

/**
 * Aceita CPF (11 dígitos) ou CNPJ (14 dígitos) já normalizado pelo cliente
 * (só dígitos). Validação em uma etapa anterior — se chegou na presentation
 * não-numérico, é bug do front.
 */
const taxIdSchema = z
  .string()
  .regex(/^\d{11}$|^\d{14}$/, "CPF ou CNPJ inválido (apenas dígitos).");

/**
 * Body do POST /v1/billing/topup/pix. O `taxId` é redundante pra quem já
 * salvou no perfil — passa pelo header de session — mas a gente exige
 * explicitamente pra que callers diretos da API não fiquem dependentes
 * de session-side state.
 */
export const pixTopupBody = z.object({
  topupId: z.enum(["topup_2k", "topup_5k", "topup_15k"]),
  taxId: taxIdSchema,
});

export const pixTopupParam = z.object({
  abacateId: z.string().min(1),
});
