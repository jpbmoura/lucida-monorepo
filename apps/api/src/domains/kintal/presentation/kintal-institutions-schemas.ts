import { z } from "zod";

export const listInstitutionsQuery = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  archived: z.enum(["active", "all", "archived"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.coerce.date().optional(),
});

export const billingModeSchema = z.enum([
  "pool",
  "per_teacher",
  "pay_per_use",
  "unlimited",
]);

export const createInstitutionBody = z.object({
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1).max(200),
  /**
   * Opcional — backend usa só quando precisa criar um user novo. Se o
   * email já existe, valor é ignorado e mantemos a senha atual do user.
   */
  ownerPassword: z.string().min(8).max(200).optional(),
  orgName: z.string().min(1).max(200),
  orgSlug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/i, "Slug inválido."),
  billingMode: billingModeSchema,
});

export const institutionRoleSchema = z.enum(["admin", "member"]);

export const addInstitutionMemberBody = z.object({
  userEmail: z.string().email(),
  /** Necessários só se o user ainda não existe; ignorados caso contrário. */
  userName: z.string().min(1).max(200).optional(),
  password: z.string().min(8).max(200).optional(),
  role: institutionRoleSchema,
});

export const memberParam = z.object({
  orgId: z.string().min(1),
  userId: z.string().min(1),
});

/** Para a tela de usuário — staff escolhe a org já existente. */
export const linkUserToInstitutionBody = z.object({
  organizationId: z.string().min(1),
  role: institutionRoleSchema,
});

export const userMembershipParam = z.object({
  userId: z.string().min(1),
  orgId: z.string().min(1),
});

export const updateInstitutionBillingBody = z.object({
  billingMode: billingModeSchema,
});

export const adjustInstitutionCreditsBody = z.object({
  amount: z
    .number()
    .int()
    .refine((v) => v !== 0, { message: "Quantidade precisa ser não-zero." }),
  expiresInDays: z.number().int().positive().nullable().optional(),
  note: z.string().trim().max(500).optional(),
});

export const institutionParam = z.object({
  orgId: z.string().min(1),
});
