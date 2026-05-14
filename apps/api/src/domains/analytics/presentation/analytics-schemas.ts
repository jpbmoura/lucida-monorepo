import { z } from "zod";

export const overviewQuery = z.object({
  period: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
});

export const orgOverviewQuery = overviewQuery;

export const classIdParam = z.object({ id: z.string().min(1) });
export const studentIdParam = z.object({ id: z.string().min(1) });
export const examIdParam = z.object({ id: z.string().min(1) });
export const teacherIdParam = z.object({ id: z.string().min(1) });

// Aceita tanto repetição (`?classIds=a&classIds=b`) — Express com qs já
// devolve array — quanto CSV (`?classIds=a,b`) por conveniência. Strings
// vazias somem; resultado final é sempre `string[] | undefined`.
const idListParam = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const raw = Array.isArray(value) ? value : value.split(",");
    const cleaned = raw.map((v) => v.trim()).filter((v) => v.length > 0);
    return cleaned.length > 0 ? cleaned : undefined;
  });

// `yyyy-mm-dd` (input nativo) ou ISO datetime completo. Convertemos pra
// Date; o use case decide como aplicar (from = início do dia, to = fim).
const dateParam = z
  .string()
  .trim()
  .min(1)
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === "") return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data inválida. Use o formato AAAA-MM-DD.",
      });
      return z.NEVER;
    }
    return parsed;
  });

// Export sempre exporta `status=submitted` — provas em andamento ficam
// de fora por definição ("submissões que foram feitas"). Filtro de data
// atua exclusivamente em `submittedAt`.
export const exportTeacherQuery = z
  .object({
    from: dateParam,
    to: dateParam,
    classIds: idListParam,
    examIds: idListParam,
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to && data.from.getTime() > data.to.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "A data final precisa ser igual ou posterior à inicial.",
      });
    }
  });

export type ExportTeacherQuery = z.infer<typeof exportTeacherQuery>;

export const acceptInviteWithSignupBody = z.object({
  invitationId: z.string().min(1),
  name: z.string().trim().min(2, "Dê um nome com ao menos 2 caracteres."),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
});
