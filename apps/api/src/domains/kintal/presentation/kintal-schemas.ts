import { z } from "zod";

// Literal inline pra satisfazer o tipo `[string, ...string[]]` do z.enum
// sem depender do `as const` do domain/PERIOD_SCOPES (readonly tuple).
export const dashboardQuery = z.object({
  period: z.enum(["today", "7d", "30d", "90d"]).default("30d"),
});
