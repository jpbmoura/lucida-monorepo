import { z } from "zod";

export const promoteStaffBody = z.object({
  email: z.string().email("E-mail inválido."),
});

export const revokeStaffParams = z.object({
  userId: z.string().min(1),
});
