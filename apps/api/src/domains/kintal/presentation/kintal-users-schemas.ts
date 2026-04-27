import { z } from "zod";

export const listKintalUsersQuery = z.object({
  q: z.string().optional(),
  subscription: z.enum(["any", "with", "without"]).optional(),
  role: z.enum(["any", "user", "staff"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.coerce.date().optional(),
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
