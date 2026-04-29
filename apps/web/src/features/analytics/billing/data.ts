import "server-only";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { OrgBillingMode } from "@/lib/active-organization";

export interface OrgBillingDTO {
  settings: {
    billingMode: OrgBillingMode;
  };
  balance: {
    total: number;
    wallets: Array<{
      source: string;
      balance: number;
      expiresAt: string | null;
    }>;
  };
  ledger: {
    items: Array<{
      id: string;
      type: "credit" | "debit";
      amount: number;
      reason: string;
      relatedAction: string | null;
      actorUserId: string | null;
      actorName: string | null;
      createdAt: string;
    }>;
  };
}

/**
 * Settings + saldo + ledger recente da org ativa. Retorna `null` em dois
 * casos:
 *   - Sessão sem org ativa (backend devolve `MISSING_ACTIVE_ORGANIZATION`).
 *   - User sem permissão (401/403 — o gate do /analytics já filtra antes,
 *     mas guardamos fallback pra não explodir se o gate falhar).
 */
export async function fetchOrgBilling(): Promise<OrgBillingDTO | null> {
  try {
    const res = await apiFetch<{ data: OrgBillingDTO }>(
      `/v1/analytics/org-billing`,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError) {
      if (
        err.code === "MISSING_ACTIVE_ORGANIZATION" ||
        err.status === 401 ||
        err.status === 403
      ) {
        return null;
      }
    }
    throw err;
  }
}

// ───── invoices (NFS-e da org) ────────────────────────────────

export type { InvoiceListItemDTO } from "@/features/app/billing/data";
import type { InvoiceListItemDTO } from "@/features/app/billing/data";

/**
 * Notas em que a org ativa foi tomadora. Vazio quando billing
 * institucional ainda não gerou cobranças (caso atual). Mesmo gating
 * de erros que `fetchOrgBilling`.
 */
export async function fetchOrgInvoices(): Promise<InvoiceListItemDTO[]> {
  try {
    const res = await apiFetch<{ data: InvoiceListItemDTO[] }>(
      `/v1/invoicing/organization`,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError) {
      if (
        err.code === "MISSING_ACTIVE_ORGANIZATION" ||
        err.status === 401 ||
        err.status === 403
      ) {
        return [];
      }
    }
    throw err;
  }
}
