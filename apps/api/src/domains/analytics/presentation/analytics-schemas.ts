import { z } from "zod";

export const overviewQuery = z.object({
  period: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
});

export const orgOverviewQuery = overviewQuery;

export const classIdParam = z.object({ id: z.string().min(1) });
export const studentIdParam = z.object({ id: z.string().min(1) });
export const examIdParam = z.object({ id: z.string().min(1) });
export const teacherIdParam = z.object({ id: z.string().min(1) });

export const acceptInviteWithSignupBody = z.object({
  invitationId: z.string().min(1),
  name: z.string().trim().min(2, "Dê um nome com ao menos 2 caracteres."),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
});
