import "server-only";
import { apiFetch, ApiError } from "@/lib/api-client";

export type ApiKeyEnvironment = "live" | "test";

export type ApiKeyScope =
  | "classes:read"
  | "classes:write"
  | "students:read"
  | "students:write"
  | "exams:read"
  | "exams:write"
  | "submissions:read"
  | "webhooks:manage";

export type WebhookEvent =
  | "submission.created"
  | "submission.scored"
  | "exam.published"
  | "exam.updated"
  | "class.created"
  | "student.enrolled";

export interface ApiKeyDTO {
  id: string;
  name: string;
  environment: ApiKeyEnvironment;
  scopes: ApiKeyScope[];
  keyLastFour: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface WebhookEndpointDTO {
  id: string;
  url: string;
  environment: ApiKeyEnvironment;
  events: WebhookEvent[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeveloperMetadataDTO {
  scopes: ApiKeyScope[];
  events: WebhookEvent[];
}

/**
 * Retorna null quando não tem org ativa — página cai pro fallback
 * `NoActiveOrg` em vez de crashar. Mesmo pattern dos outros feeds.
 */
export async function fetchApiKeys(): Promise<ApiKeyDTO[] | null> {
  try {
    const res = await apiFetch<{ data: ApiKeyDTO[] }>(
      `/v1/analytics/developer/api-keys`,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.code === "MISSING_ACTIVE_ORGANIZATION") {
      return null;
    }
    throw err;
  }
}

export async function fetchWebhookEndpoints(): Promise<
  WebhookEndpointDTO[] | null
> {
  try {
    const res = await apiFetch<{ data: WebhookEndpointDTO[] }>(
      `/v1/analytics/developer/webhook-endpoints`,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && err.code === "MISSING_ACTIVE_ORGANIZATION") {
      return null;
    }
    throw err;
  }
}

export async function fetchDeveloperMetadata(): Promise<DeveloperMetadataDTO> {
  const res = await apiFetch<{ data: DeveloperMetadataDTO }>(
    `/v1/analytics/developer/metadata`,
  );
  return res.data;
}
