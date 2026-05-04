import "server-only";
import { cache } from "react";
import { getServerSession } from "./get-server-session";
import { fetchImpersonateState } from "./impersonate-state";

export interface EffectiveUser {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Retorna o user "efetivo" — quem o request **age como**:
 * - quando há sessão de impersonate ativa, o alvo (ex: durante "atuar
 *   como instituição", retorna o owner da org).
 * - senão, o real user logado.
 *
 * Use isso pra Topbar, greeting ("Bom dia, X"), e qualquer display do
 * `/app`. Para validações de permissão (`role === "staff"`), continue
 * usando `getServerSession()` — esse sempre aponta pro real user
 * (impersonate não muda role).
 *
 * Wrapped com `cache()` do React: chamadas múltiplas dentro do mesmo
 * request (layout + page + nested) deduplicam fetch automaticamente.
 */
export const getEffectiveUser = cache(
  async (): Promise<EffectiveUser | null> => {
    const session = await getServerSession();
    if (!session) return null;

    const impersonate = await fetchImpersonateState().catch(() => null);
    if (impersonate?.isImpersonating && impersonate.actingAs) {
      return {
        id: impersonate.actingAs.id,
        name: impersonate.actingAs.name || null,
        email: impersonate.actingAs.email,
      };
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };
  },
);
