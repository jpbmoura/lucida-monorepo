"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Inicia impersonate via POST no backend. O backend seta o cookie
 * `lucida.impersonate` na resposta — propagamos pro browser via Next
 * cookies API. Em sucesso: redireciona pra `/app` direto. Em falha:
 * devolve a mensagem pra o componente cliente exibir.
 */
export async function startImpersonateAction(
  teacherId: string,
): Promise<ActionResult> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/analytics/impersonate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader,
      },
      body: JSON.stringify({ teacherId }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Falha de conexão com a API." };
  }

  if (!res.ok) {
    const body = await res.text();
    try {
      const parsed = JSON.parse(body) as { message?: string };
      return {
        ok: false,
        error: parsed.message ?? "Não foi possível iniciar impersonate.",
      };
    } catch {
      return { ok: false, error: "Não foi possível iniciar impersonate." };
    }
  }

  // Propaga o cookie do backend pro browser (Next intercepta).
  applySetCookies(res, cookieStore);

  // O redirect server-side faz o browser carregar /app já com o cookie ativo.
  // (Não pode ficar dentro do try/catch — Next usa throw pra navegar.)
  redirect("/app");
}

export async function stopImpersonateAction(redirectTo?: string): Promise<void> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const res = await fetch(`${API_URL}/v1/analytics/impersonate`, {
      method: "DELETE",
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    applySetCookies(res, cookieStore);
  } catch {
    // Tolerar — mesmo com erro de rede, redireciona o user. O cookie pode
    // continuar até expirar; pior caso = mesmo redirect, próxima request
    // ainda mostra impersonate. Aceitável pro MVP.
  }

  redirect(redirectTo ?? "/analytics");
}

/**
 * Aplica `Set-Cookie` da resposta do backend nos cookies do Next. Isso é
 * necessário porque o fetch server-side não compartilha cookies com o
 * browser automaticamente — precisa rodar manualmente.
 */
function applySetCookies(
  res: Response,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): void {
  // `getSetCookie` é Web standard moderno — não inclui type em `Headers`
  // sempre, mas Node 20+ tem.
  const setCookies =
    typeof (res.headers as unknown as { getSetCookie?: () => string[] })
      .getSetCookie === "function"
      ? (
          res.headers as unknown as { getSetCookie: () => string[] }
        ).getSetCookie()
      : [];
  for (const raw of setCookies) {
    const [namePair, ...attrs] = raw.split(";").map((s) => s.trim());
    if (!namePair) continue;
    const eq = namePair.indexOf("=");
    if (eq === -1) continue;
    const name = namePair.slice(0, eq);
    const value = namePair.slice(eq + 1);

    const opts: Parameters<typeof cookieStore.set>[2] = {};
    for (const a of attrs) {
      const [k, v] = a.split("=");
      const key = (k ?? "").toLowerCase();
      if (key === "max-age") opts.maxAge = Number(v);
      else if (key === "path") opts.path = v ?? "/";
      else if (key === "samesite") {
        const sv = (v ?? "").toLowerCase();
        if (sv === "lax" || sv === "strict" || sv === "none") opts.sameSite = sv;
      } else if (key === "httponly") opts.httpOnly = true;
      else if (key === "secure") opts.secure = true;
    }
    cookieStore.set(name, value, opts);
  }
}
