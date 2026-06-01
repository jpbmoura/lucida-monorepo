import "server-only";
import { redirect } from "next/navigation";
import { getServerSession } from "./get-server-session";

// Aceita só caminhos internos ("/algo") — evita open redirect via ?next=//evil.com
// ou ?next=https://… Vindo do middleware o `next` é sempre interno, mas a query
// é controlável pelo usuário, então validamos antes de confiar.
function isSafeInternalPath(path: string | undefined): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

// Usado no topo das páginas de auth (sign-in, sign-up, organizações/entrar).
// Se já existe sessão válida, manda o user direto pro destino — sem mostrar o
// form de login de novo. Valida a sessão de fato (fetch pra BA), não só a
// presença do cookie, pra não cair em loop com cookie expirado.
export async function redirectIfAuthenticated(
  defaultDestination: string,
  next?: string,
): Promise<void> {
  const session = await getServerSession();
  if (!session) return;
  redirect(isSafeInternalPath(next) ? next : defaultDestination);
}
