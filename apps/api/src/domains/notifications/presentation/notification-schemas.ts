import { z } from "zod";
import { SEVERITIES } from "../domain/severity.js";

const audienceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("user"), userId: z.string().min(1) }),
  z.object({
    type: z.literal("organization"),
    organizationId: z.string().min(1),
  }),
  z.object({ type: z.literal("paying_customers") }),
  z.object({ type: z.literal("free_customers") }),
  z.object({ type: z.literal("all_customers") }),
]);

/** Audiência pra org admin — só "membros da própria org". */
const orgAdminAudienceSchema = z.object({
  type: z.literal("org_members"),
});

const baseSendBody = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(1_000),
  severity: z.enum(SEVERITIES),
  link: z.string().url().nullable().optional(),
});

export const staffSendBody = baseSendBody.extend({
  audience: audienceSchema,
});

export const orgAdminSendBody = baseSendBody.extend({
  audience: orgAdminAudienceSchema,
});

export const inboxQuery = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  includeDismissed: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.coerce.date().optional(),
});

export const notificationIdParams = z.object({
  notificationId: z.string().min(1),
});

export const campaignIdParams = z.object({
  campaignId: z.string().min(1),
});

export type StaffSendBody = z.infer<typeof staffSendBody>;
export type OrgAdminSendBody = z.infer<typeof orgAdminSendBody>;
