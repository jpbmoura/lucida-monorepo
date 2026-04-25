import "server-only";
import { apiFetch } from "./api-client";

export type OrgBillingMode = "pool" | "per_teacher" | "pay_per_use";

export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  /**
   * Role do user logado nessa org. `null` quando o user tem org ativa mas
   * não consegue encontrar o member (estado raro — aceitar como "member"
   * no lado da UI é seguro). Usado pra gate do /analytics (owner/admin).
   */
  myRole: "owner" | "admin" | "member" | null;
  /**
   * Modo de cobrança da org. Dita comportamentos visuais no /app — em
   * "pool" e "pay_per_use" a wallet pessoal não é usada, então escondemos
   * o BalanceWidget. Null quando settings ainda não provisionadas (fallback
   * seguro = trata como não-institucional visualmente).
   */
  billingMode: OrgBillingMode | null;
}

/**
 * Info enxuta da org ativa na sessão — consumida pelo shell do /analytics
 * (badge cheio no topbar) e pelo shell do /app (eyebrow discreto "Via ...").
 * Retorna `null` quando o user não é member de nenhuma org ou não chamou
 * `setActive` (caso típico: professor comum no /app).
 */
export async function fetchActiveOrganization(): Promise<ActiveOrganization | null> {
  const res = await apiFetch<{ data: ActiveOrganization | null }>(
    `/v1/analytics/active-organization`,
  );
  return res.data;
}

/**
 * Helper: true quando a instituição paga pela ação do user. Em pool e
 * pay_per_use, a wallet pessoal é irrelevante — frontend esconde saldo
 * pessoal e mostra mensagens institucionais quando falta crédito.
 */
export function isOrgPayingForUser(
  billingMode: OrgBillingMode | null | undefined,
): boolean {
  return billingMode === "pool" || billingMode === "pay_per_use";
}
