"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  AudienceDescriptor,
  CampaignDetail,
  CampaignSummary,
  InboxItem,
  InboxResponse,
  NotificationActionResult,
  SendResult,
  Severity,
  UnreadCountResponse,
} from "./types";

// ───── inbox (qualquer user autenticado) ───────────────────────

export async function fetchInbox(filter?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<InboxItem[]> {
  const sp = new URLSearchParams();
  if (filter?.unreadOnly) sp.set("unreadOnly", "true");
  if (filter?.limit) sp.set("limit", String(filter.limit));
  const qs = sp.toString();
  const data = await apiFetch<InboxResponse>(
    `/api/notifications${qs ? `?${qs}` : ""}`,
  );
  return data.data.notifications;
}

export async function fetchUnreadCount(): Promise<number> {
  const data = await apiFetch<UnreadCountResponse>(
    "/api/notifications/unread-count",
  );
  return data.data.count;
}

export async function markAsReadAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  try {
    await apiFetch<void>(
      `/api/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: "POST" },
    );
    revalidatePath("/app/notificacoes");
    revalidatePath("/analytics/notificacoes");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function markAllAsReadAction(): Promise<NotificationActionResult> {
  try {
    await apiFetch<void>("/api/notifications/mark-all-read", {
      method: "POST",
    });
    revalidatePath("/app/notificacoes");
    revalidatePath("/analytics/notificacoes");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

export async function dismissNotificationAction(
  notificationId: string,
): Promise<NotificationActionResult> {
  try {
    await apiFetch<void>(
      `/api/notifications/${encodeURIComponent(notificationId)}`,
      { method: "DELETE" },
    );
    revalidatePath("/app/notificacoes");
    revalidatePath("/analytics/notificacoes");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

// ───── sender (staff) ──────────────────────────────────────────

export async function sendAsStaffAction(input: {
  title: string;
  body: string;
  severity: Severity;
  link?: string | null;
  audience: AudienceDescriptor;
}): Promise<NotificationActionResult<SendResult>> {
  try {
    const data = await apiFetch<{ data: SendResult }>(
      "/api/kintal/notifications",
      { method: "POST", body: input },
    );
    revalidatePath("/kintal/notifications");
    return { ok: true, data: data.data };
  } catch (err) {
    return toResult(err) as NotificationActionResult<SendResult>;
  }
}

export async function fetchStaffCampaigns(): Promise<CampaignSummary[]> {
  const data = await apiFetch<{ data: { campaigns: CampaignSummary[] } }>(
    "/api/kintal/notifications/campaigns",
  );
  return data.data.campaigns;
}

export async function fetchStaffCampaign(
  campaignId: string,
): Promise<CampaignDetail> {
  const data = await apiFetch<{ data: CampaignDetail }>(
    `/api/kintal/notifications/campaigns/${encodeURIComponent(campaignId)}`,
  );
  return data.data;
}

export async function deleteStaffCampaignAction(
  campaignId: string,
): Promise<NotificationActionResult> {
  try {
    await apiFetch<void>(
      `/api/kintal/notifications/campaigns/${encodeURIComponent(campaignId)}`,
      { method: "DELETE" },
    );
    revalidatePath("/kintal/notifications");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

// ───── sender (org admin) ──────────────────────────────────────

export async function sendAsOrgAdminAction(input: {
  title: string;
  body: string;
  severity: Severity;
  link?: string | null;
}): Promise<NotificationActionResult<SendResult>> {
  try {
    const data = await apiFetch<{ data: SendResult }>(
      "/api/analytics/notifications",
      {
        method: "POST",
        body: { ...input, audience: { type: "org_members" } },
      },
    );
    revalidatePath("/analytics/notificacoes/enviar");
    return { ok: true, data: data.data };
  } catch (err) {
    return toResult(err) as NotificationActionResult<SendResult>;
  }
}

export async function fetchOrgAdminCampaigns(): Promise<CampaignSummary[]> {
  const data = await apiFetch<{ data: { campaigns: CampaignSummary[] } }>(
    "/api/analytics/notifications/campaigns",
  );
  return data.data.campaigns;
}

export async function deleteOrgAdminCampaignAction(
  campaignId: string,
): Promise<NotificationActionResult> {
  try {
    await apiFetch<void>(
      `/api/analytics/notifications/campaigns/${encodeURIComponent(campaignId)}`,
      { method: "DELETE" },
    );
    revalidatePath("/analytics/notificacoes/enviar");
    return { ok: true };
  } catch (err) {
    return toResult(err);
  }
}

// ───── helpers ─────────────────────────────────────────────────

function toResult<T = void>(err: unknown): NotificationActionResult<T> {
  if (err instanceof ApiError) {
    return { ok: false, code: err.code, message: err.message };
  }
  return {
    ok: false,
    code: "UNKNOWN",
    message: "Erro inesperado — tente novamente em alguns segundos.",
  };
}
