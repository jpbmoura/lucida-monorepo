import { z } from "zod";

export const startImpersonateBody = z.object({
  userId: z.string().min(1),
});
