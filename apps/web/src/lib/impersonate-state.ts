import "server-only";
import { apiFetch, ApiError } from "./api-client";

export type ImpersonateMode = "org-admin" | "staff";

export interface ImpersonateState {
  isImpersonating: boolean;
  /**
   * `null` quando não há impersonate; senão indica de onde veio. Frontend
   * usa pra decidir o endpoint de stop e o redirect ao encerrar.
   */
  mode: ImpersonateMode | null;
  realUser: { id: string; email: string };
  actingAs: { id: string; email: string; name: string } | null;
}

/**
 * Lê estado atual de impersonate da sessão. Sempre retorna um shape válido
 * — se o user não está logado, devolvemos `null` pra a chamada decidir.
 *
 * É consumido pelo layout do `/app` pra renderizar o banner "Atuando
 * como X · Sair" no topo da página quando aplicável.
 */
export async function fetchImpersonateState(): Promise<ImpersonateState | null> {
  try {
    const res = await apiFetch<{ data: ImpersonateState }>(
      `/v1/analytics/impersonate`,
    );
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}
