"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Inicia a sessão de impersonate (staff "vira" um user). Backend grava
 * o audit log + seta o cookie `lucida.impersonate`. A gente propaga o
 * cookie pro browser e redireciona pra `/app` — onde o middleware do
 * `requireAuth` resolve o cookie e o user navega como se fosse o alvo.
 *
 * Variante staff do `startImpersonateAction` do analytics — mesma lógica
 * de cookie, mas sem checagem de org admin.
 */
export async function startKintalImpersonateAction(
  targetUserId: string,
): Promise<ActionResult> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/kintal/impersonate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: cookieHeader,
      },
      body: JSON.stringify({ userId: targetUserId }),
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
        error: parsed.message ?? "Não foi possível iniciar.",
      };
    } catch {
      return { ok: false, error: "Não foi possível iniciar." };
    }
  }

  applySetCookies(res, cookieStore);
  // Redirect server-side faz o browser carregar /app já com o cookie ativo.
  redirect("/app");
}

/**
 * Encerra impersonate. Best-effort — mesmo com erro de rede, redireciona.
 * `redirectTo` permite voltar pra origem (ex: detalhe do user no Kintal).
 */
export async function stopKintalImpersonateAction(
  redirectTo: string,
): Promise<void> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const res = await fetch(`${API_URL}/api/kintal/impersonate`, {
      method: "DELETE",
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    applySetCookies(res, cookieStore);
  } catch {
    // Tolerar — pior caso o cookie continua até expirar (8h).
  }

  redirect(redirectTo);
}

function applySetCookies(
  res: Response,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): void {
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
