import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { Auth } from "../../infrastructure/better-auth/auth.js";
import { UnauthorizedError } from "../errors.js";
import {
  IMPERSONATE_COOKIE_NAME,
  parseImpersonateCookieValue,
} from "../../infrastructure/impersonate-cookie.js";
import {
  ASSISTANT_TARGET_COOKIE_NAME,
  parseAssistantTargetCookieValue,
} from "../../infrastructure/assistant-target-cookie.js";
import type { OrganizationMembersRepository } from "@/domains/analytics/application/ports/organization-members-repository.js";
import type { TeacherAssistantRepository } from "../../domain/teacher-assistant-repository.js";

export interface AuthContext {
  /**
   * "Effective userId" — quem o request **age como**. Em modo normal igual
   * ao realUserId; em modo impersonate é o teacherId. Use isso pra filtros
   * de ownership (`ownerId === userId`).
   */
  userId: string;
  email: string;
  /** ID do user **realmente logado** (sempre o owner da sessão BA). */
  realUserId: string;
  realEmail: string;
  /**
   * Role de identidade — vem do additionalField `role` do user BA. `null`
   * pra conta comum (professor/instituição). `"staff"` libera /api/kintal.
   * Sempre do real user (impersonate não muda role).
   */
  realUserRole: string | null;
  /** True quando userId !== realUserId. */
  isImpersonating: boolean;
  /**
   * True quando a sessão é de um auxiliar atendendo um professor (modo
   * "atuação delegada"). Implica `isImpersonating: true`. Distingue do
   * impersonate de admin org via cookie pra que `denyAssistant` consiga
   * bloquear ações sensíveis sem afetar admins.
   */
  isAssistant: boolean;
  sessionId: string;
  activeOrganizationId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

interface MakeRequireAuthDeps {
  /**
   * Opcional. Quando provido, ativa a lógica de impersonate: o middleware
   * lê o cookie `lucida.impersonate`, valida que o user logado é admin/owner
   * da org ativa e que o `teacherId` é member, e então decora `req.auth`
   * com `userId = teacherId`. Sem este repo o middleware funciona em modo
   * clássico (sem impersonate).
   */
  orgMembersRepository?: OrganizationMembersRepository;
  /**
   * Opcional. Quando provido, ativa o "modo auxiliar": quando o user
   * logado é assistente delegado de um professor, o middleware lê o
   * cookie `lucida.assistant_target`, valida o vínculo e seta `userId`
   * = teacherId + override do `activeOrganizationId` pro contexto do
   * professor. Sem este repo, auxiliares logam mas operam como o
   * próprio user (sem delegação).
   */
  teacherAssistantsRepository?: TeacherAssistantRepository;
  /** Secret pra validar o HMAC do cookie. Default `process.env.AUTH_SECRET`. */
  authSecret?: string;
}

export function makeRequireAuth(
  auth: Auth,
  deps: MakeRequireAuthDeps = {},
): RequestHandler {
  const orgMembers = deps.orgMembersRepository;
  const teacherAssistants = deps.teacherAssistantsRepository;
  const secret = deps.authSecret ?? process.env.AUTH_SECRET ?? "";

  return async (req, _res, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        throw new UnauthorizedError();
      }

      const realUserId = session.user.id;
      const realEmail = session.user.email;
      // `role` é um additionalField opcional — BA devolve como unknown no
      // session.user genérico; narrow pra string|null.
      const rawRole = (session.user as { role?: unknown }).role;
      const realUserRole =
        typeof rawRole === "string" && rawRole.length > 0 ? rawRole : null;
      let activeOrganizationId =
        "activeOrganizationId" in session.session
          ? (session.session.activeOrganizationId as string | null)
          : null;

      // Default: sem impersonate.
      let userId = realUserId;
      let email = realEmail;
      let isImpersonating = false;
      let isAssistant = false;

      // Modo auxiliar tem precedência sobre o impersonate de admin —
      // um auxiliar não tem porque ter cookie de impersonate, e os dois
      // caminhos não se misturam. Se o cookie do auxiliar resolve um
      // vínculo válido, paramos por aqui.
      if (teacherAssistants && secret) {
        const targetTeacherId = readAssistantTarget(req, secret);
        if (targetTeacherId && targetTeacherId !== realUserId) {
          const link = await teacherAssistants.findActiveLink({
            assistantUserId: realUserId,
            teacherUserId: targetTeacherId,
          });
          if (link) {
            userId = link.teacherUserId;
            // Override pra que BillingTargetResolver mande pro scope=org
            // certo, mesmo o auxiliar não sendo member da BA.
            activeOrganizationId = link.organizationId;
            // Email do "userId atuante" — preenchido só se org repo
            // estiver disponível; senão fica "" (clientes do AuthContext
            // que precisam de email do teacher devem ler do user store).
            if (orgMembers) {
              const members = await orgMembers.listMembers(
                link.organizationId,
              );
              email =
                members.find((m) => m.userId === link.teacherUserId)?.email ??
                "";
            } else {
              email = "";
            }
            isImpersonating = true;
            isAssistant = true;
          }
        }
      }

      // Impersonate de admin org — só ativa se ainda não estamos em
      // modo auxiliar.
      if (!isAssistant && orgMembers && secret) {
        const teacherId = readImpersonateTarget(req, secret);
        if (teacherId && activeOrganizationId && teacherId !== realUserId) {
          // Valida: real user é owner/admin da org E teacherId é member.
          // Se qualquer regra falhar, ignora silenciosamente o cookie em
          // vez de bloquear — o estado "cookie expirado" é normal.
          const [realRole, teacherRole] = await Promise.all([
            orgMembers.findRole(activeOrganizationId, realUserId),
            orgMembers.findRole(activeOrganizationId, teacherId),
          ]);
          const realIsAdmin = realRole === "owner" || realRole === "admin";
          const teacherIsMember = teacherRole !== null;
          if (realIsAdmin && teacherIsMember) {
            // Busca dados do teacher pra preencher o `email`. Não throw — se
            // não achar (race com revoke), mantém impersonate só com id.
            const members = await orgMembers.listMembers(activeOrganizationId);
            const target = members.find((m) => m.userId === teacherId);
            userId = teacherId;
            email = target?.email ?? "";
            isImpersonating = true;
          }
        }
      }

      req.auth = {
        userId,
        email,
        realUserId,
        realEmail,
        realUserRole,
        isImpersonating,
        isAssistant,
        sessionId: session.session.id,
        activeOrganizationId,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}

function readAssistantTarget(
  req: { headers: { cookie?: string } },
  secret: string,
): string | null {
  const cookies = parseCookieHeader(req.headers.cookie);
  const value = cookies[ASSISTANT_TARGET_COOKIE_NAME];
  if (typeof value !== "string") return null;
  return parseAssistantTargetCookieValue(value, secret);
}

/**
 * Extrai o `lucida.impersonate` do header Cookie. Não usa lib externa pra
 * evitar dep nova; o parser é simples (split por `;` + trim).
 */
function readImpersonateTarget(
  req: { headers: { cookie?: string } },
  secret: string,
): string | null {
  const cookies = parseCookieHeader(req.headers.cookie);
  const value = cookies[IMPERSONATE_COOKIE_NAME];
  if (typeof value !== "string") return null;
  return parseImpersonateCookieValue(value, secret);
}

function parseCookieHeader(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  return Object.fromEntries(
    raw
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const eq = c.indexOf("=");
        if (eq === -1) return [c, ""];
        return [c.slice(0, eq), decodeURIComponent(c.slice(eq + 1))];
      }),
  );
}
