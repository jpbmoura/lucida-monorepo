"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiFetch } from "@/lib/api-client";

// ─── Compose new email (staff-initiated) ────────────────────────────

export interface SendNewEmailInput {
  customerEmail: string;
  customerName?: string | null;
  subject: string;
  bodyText: string;
}

export type SendNewEmailResult =
  | { ok: true; ticketId: string }
  | {
      ok: false;
      code:
        | "TICKETS_NOT_CONFIGURED"
        | "TICKET_COMPOSE_INVALID_EMAIL"
        | "TICKET_COMPOSE_SUBJECT_EMPTY"
        | "TICKET_COMPOSE_BODY_EMPTY"
        | "VALIDATION_ERROR"
        | "UNKNOWN";
      message: string;
    };

export async function sendNewEmailAction(
  input: SendNewEmailInput,
): Promise<SendNewEmailResult> {
  try {
    const res = await apiFetch<{ data: { ticketId: string } }>("/v1/tickets", {
      method: "POST",
      body: input,
    });
    revalidatePath("/kintal/emails");
    return { ok: true, ticketId: res.data.ticketId };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        ok: false,
        code: narrowComposeCode(err.code),
        message: err.message,
      };
    }
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Erro inesperado ao enviar — tente de novo em alguns segundos.",
    };
  }
}

function narrowComposeCode(
  raw: string,
): Extract<SendNewEmailResult, { ok: false }>["code"] {
  switch (raw) {
    case "TICKETS_NOT_CONFIGURED":
    case "TICKET_COMPOSE_INVALID_EMAIL":
    case "TICKET_COMPOSE_SUBJECT_EMPTY":
    case "TICKET_COMPOSE_BODY_EMPTY":
    case "VALIDATION_ERROR":
      return raw;
    default:
      return "UNKNOWN";
  }
}

// ─── Bulk status update ─────────────────────────────────────────────

export type BulkTargetStatus = "in_progress" | "done" | "read";

export interface BulkUpdateStatusResult {
  ok: boolean;
  updatedCount: number;
  notFoundCount: number;
  /** Mensagem amigável quando algo dá errado (rede/validação). */
  errorMessage: string | null;
}

export async function bulkUpdateStatusAction(
  ids: string[],
  status: BulkTargetStatus,
): Promise<BulkUpdateStatusResult> {
  if (ids.length === 0) {
    return {
      ok: false,
      updatedCount: 0,
      notFoundCount: 0,
      errorMessage: "Nenhum email selecionado.",
    };
  }
  try {
    const res = await apiFetch<{
      data: { updatedIds: string[]; notFoundIds: string[] };
    }>("/v1/tickets/bulk/status", {
      method: "POST",
      body: { ids, status },
    });
    revalidatePath("/kintal/emails");
    return {
      ok: true,
      updatedCount: res.data.updatedIds.length,
      notFoundCount: res.data.notFoundIds.length,
      errorMessage: null,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        ok: false,
        updatedCount: 0,
        notFoundCount: 0,
        errorMessage: err.message,
      };
    }
    return {
      ok: false,
      updatedCount: 0,
      notFoundCount: 0,
      errorMessage: "Erro inesperado — tente de novo em alguns segundos.",
    };
  }
}

// ─── Recipient search (combobox) ────────────────────────────────────

export interface RecipientSuggestion {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Reusa `GET /api/kintal/users?q=...` (que já faz match em name/email
 * com regex segura). Retorno enxuto pra hidratar o combobox sem trafegar
 * créditos/subscription/etc.
 */
export async function searchRecipientsAction(
  query: string,
): Promise<RecipientSuggestion[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const params = new URLSearchParams({ q, limit: "8" });
    const res = await apiFetch<{
      users: Array<{ id: string; name: string | null; email: string }>;
    }>(`/api/kintal/users?${params.toString()}`);
    return res.users.map((u) => ({ id: u.id, name: u.name, email: u.email }));
  } catch {
    // Combobox tolera falha — retornar lista vazia mantém UX (usuário
    // pode digitar email livre).
    return [];
  }
}
