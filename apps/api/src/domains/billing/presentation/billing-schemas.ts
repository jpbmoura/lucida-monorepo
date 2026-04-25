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
