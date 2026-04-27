import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { Auth } from "../../infrastructure/better-auth/auth.js";

/**
 * Hidrata `req.auth` quando há sessão BA válida, mas NUNCA bloqueia o
 * request — endpoints que misturam acesso público com personalização
 * (ex.: GET /api/roadmap marcando votos do user logado) usam isso. Sem
 * impersonate: rotas públicas não precisam dessa complexidade.
 */
export function makeOptionalAuth(auth: Auth): RequestHandler {
  return async (req, _res, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (session) {
        const realUserId = session.user.id;
        const realEmail = session.user.email;
        const rawRole = (session.user as { role?: unknown }).role;
        const realUserRole =
          typeof rawRole === "string" && rawRole.length > 0 ? rawRole : null;
        const activeOrganizationId =
          "activeOrganizationId" in session.session
            ? (session.session.activeOrganizationId as string | null)
            : null;
        req.auth = {
          userId: realUserId,
          email: realEmail,
          realUserId,
          realEmail,
          realUserRole,
          isImpersonating: false,
          sessionId: session.session.id,
          activeOrganizationId,
        };
      }
      next();
    } catch {
      // Falha ao ler sessão não pode quebrar rota pública. Segue como anônimo.
      next();
    }
  };
}
