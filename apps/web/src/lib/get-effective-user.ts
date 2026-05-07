import "server-only";
import { cache } from "react";
import { apiFetch, ApiError } from "./api-client";

export interface EffectiveUser {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Retorna o user "efetivo" — quem o request **age como**.
 *
 * Fonte: `GET /v1/me`, que já passa pelo `requireAuth` da api e respeita
 * todos os modos de override (impersonate de staff/admin org E modo
 * auxiliar). Assim o frontend tem uma única fonte de verdade pro user
 * "atuante" em vez de duplicar a lógica do middleware aqui.
 *
 * Use isso pra Topbar, greeting ("Bom dia, X"), e qualquer display do
 * `/app`. Para validações de permissão (`role === "staff"`), continue
 * usando `getServerSession()` — esse sempre aponta pro real user
 * (impersonate/assistant não muda role).
 *
 * Wrapped com `cache()` do React: chamadas múltiplas dentro do mesmo
 * request (layout + page + nested) deduplicam fetch automaticamente.
 */
export const getEffectiveUser = cache(
  async (): Promise<EffectiveUser | null> => {
    try {
      const res = await apiFetch<{
        data: { id: string; name?: string | null; email: string };
      }>("/v1/me");
      return {
        id: res.data.id,
        name: res.data.name ?? null,
        email: res.data.email,
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },
);
