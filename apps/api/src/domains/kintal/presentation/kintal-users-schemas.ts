import { z } from "zod";

export const listKintalUsersQuery = z.object({
  q: z.string().optional(),
  subscription: z
    .enum(["any", "without", "active", "past_due", "canceled", "paused"])
    .optional(),
  role: z.enum(["any", "user", "staff"]).optional(),
  createdWithin: z.enum(["today", "7d", "30d"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  /**
   * Mantido por retrocompatibilidade — quando passado sem `pageSize`
   * vira o pageSize. Novos consumidores devem usar `page`/`pageSize`.
   */
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const userIdParams = z.object({
  userId: z.string().min(1),
});

const optionalString = z
  .string()
  .max(500)
  .nullable()
  .optional();

export const updateKintalUserBody = z.object({
  name: z.string().min(1).max(200).optional(),
  whatsapp: optionalString,
  institutionType: optionalString,
  stateUf: optionalString,
  studentsRange: optionalString,
  teachingYears: optionalString,
  acquisitionChannel: optionalString,
});

export const adjustCreditsBody = z.object({
  // Inteiro não-zero. Validação fina ("não pode ser 0") fica no use case
  // pra dar mensagem mais útil.
  amount: z.number().int(),
  note: z.string().max(500).optional(),
});
