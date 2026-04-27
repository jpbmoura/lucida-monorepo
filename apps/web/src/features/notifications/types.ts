// Tipos compartilhados entre /app, /analytics e /kintal. Espelhados do
// backend ([apps/api/src/domains/notifications]).

export const SEVERITIES = ["info", "success", "warning", "alert"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<Severity, string> = {
  info: "Informação",
  success: "Sucesso",
  warning: "Aviso",
  alert: "Urgente",
};

/**
 * Cores semânticas usadas em badges/pills/pontos de severidade. `info`
 * usa o token `accent` (themeável) — em /app vira azul, em /analytics
 * roxo, em /kintal preto. Os outros são universais (success/warning/alert
 * têm semântica fixa cross-theme).
 */
export const SEVERITY_DOT_CLASS: Record<Severity, string> = {
  info: "bg-accent",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  alert: "bg-red-500",
};

export const SEVERITY_BADGE_CLASS: Record<Severity, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-100",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  alert: "bg-red-50 text-red-700 border-red-100",
};

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  senderRole: "staff" | "org_admin" | "system";
  audienceLabel: string;
}

export interface InboxResponse {
  data: { notifications: InboxItem[] };
}

export interface UnreadCountResponse {
  data: { count: number };
}

export type AudienceDescriptor =
  | { type: "user"; userId: string }
  | { type: "organization"; organizationId: string }
  | { type: "paying_customers" }
  | { type: "free_customers" }
  | { type: "all_customers" };

export interface CampaignSummary {
  campaignId: string;
  title: string;
  body: string;
  severity: Severity;
  link: string | null;
  audienceLabel: string;
  senderUserId: string;
  senderRole: "staff" | "org_admin" | "system";
  senderOrgId: string | null;
  createdAt: string;
  recipientCount: number;
  readCount: number;
  readRatePct: number;
}

export interface CampaignReceipt {
  recipientUserId: string;
  readAt: string | null;
  dismissedAt: string | null;
}

export interface CampaignDetail {
  campaignId: string;
  title: string;
  body: string;
  severity: Severity;
  link: string | null;
  audienceLabel: string;
  senderUserId: string;
  senderRole: "staff" | "org_admin" | "system";
  senderOrgId: string | null;
  createdAt: string;
  recipientCount: number;
  readCount: number;
  receipts: CampaignReceipt[];
}

export interface SendResult {
  campaignId: string;
  recipientCount: number;
  audienceLabel: string;
}

export type NotificationActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; code: string; message: string };
