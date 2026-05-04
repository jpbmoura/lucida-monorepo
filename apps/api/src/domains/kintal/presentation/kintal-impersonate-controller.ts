import type { RequestHandler } from "express";
import {
  IMPERSONATE_COOKIE_NAME,
  buildImpersonateCookieValue,
  impersonateCookieAttributes,
} from "@/domains/iam/infrastructure/impersonate-cookie.js";
import {
  IMPERSONATE_ORG_COOKIE_NAME,
  buildImpersonateOrgCookieValue,
  impersonateOrgCookieAttributes,
} from "@/domains/iam/infrastructure/impersonate-org-cookie.js";
import { env } from "@/env.js";
import type { StartKintalImpersonateUseCase } from "../application/start-kintal-impersonate.js";
import type { StartInstitutionImpersonateUseCase } from "../application/start-institution-impersonate.js";
import type { StopKintalImpersonateUseCase } from "../application/stop-kintal-impersonate.js";
import { startImpersonateBody } from "./kintal-impersonate-schemas.js";
import { institutionParam } from "./kintal-institutions-schemas.js";

interface Deps {
  startImpersonate: StartKintalImpersonateUseCase;
  startInstitutionImpersonate: StartInstitutionImpersonateUseCase;
  stopImpersonate: StopKintalImpersonateUseCase;
}

/**
 * Endpoints staff-only pra controlar a sessão de impersonate do Kintal.
 * O cookie usado é o mesmo `lucida.impersonate` consumido pelo
 * `requireAuth` — diferença está só nas validações de start (sem
 * checagem de org, com audit log).
 */
export class KintalImpersonateController {
  constructor(private readonly deps: Deps) {}

  start: RequestHandler = async (req, res, next) => {
    try {
      const { userId: targetUserId } = startImpersonateBody.parse(req.body);
      const staffUserId = req.auth!.realUserId;

      await this.deps.startImpersonate.execute({
        staffUserId,
        targetUserId,
        userAgent: req.headers["user-agent"]?.toString() ?? null,
        ipAddress: extractIp(req) ?? null,
      });

      const cookieValue = buildImpersonateCookieValue(
        targetUserId,
        env.AUTH_SECRET,
      );
      res.cookie(
        IMPERSONATE_COOKIE_NAME,
        cookieValue,
        impersonateCookieAttributes({
          isProduction: env.NODE_ENV === "production",
        }),
      );
      // "Atuar como user" não tem contexto de org — limpa o cookie de
      // org caso ele tenha sobrado de uma sessão anterior de "atuar como
      // instituição", senão o middleware fixaria a org errada.
      res.clearCookie(IMPERSONATE_ORG_COOKIE_NAME, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        path: "/",
      });
      res.status(200).json({ data: { ok: true, targetUserId } });
    } catch (err) {
      next(err);
    }
  };

  startForInstitution: RequestHandler = async (req, res, next) => {
    try {
      const { orgId } = institutionParam.parse(req.params);
      const staffUserId = req.auth!.realUserId;

      const result = await this.deps.startInstitutionImpersonate.execute({
        staffUserId,
        organizationId: orgId,
        userAgent: req.headers["user-agent"]?.toString() ?? null,
        ipAddress: extractIp(req) ?? null,
      });

      const cookieValue = buildImpersonateCookieValue(
        result.targetUserId,
        env.AUTH_SECRET,
      );
      res.cookie(
        IMPERSONATE_COOKIE_NAME,
        cookieValue,
        impersonateCookieAttributes({
          isProduction: env.NODE_ENV === "production",
        }),
      );
      // Carimba a org escolhida no cookie auxiliar pra o middleware
      // ativar exatamente essa instituição — sem isso, ele cairia no
      // heurístico `listMembershipsByUser[0]` e poderia fixar uma org
      // diferente caso o owner alvo pertença a múltiplas.
      res.cookie(
        IMPERSONATE_ORG_COOKIE_NAME,
        buildImpersonateOrgCookieValue(
          result.organizationId,
          env.AUTH_SECRET,
        ),
        impersonateOrgCookieAttributes({
          isProduction: env.NODE_ENV === "production",
        }),
      );
      res.status(200).json({
        data: {
          ok: true,
          targetUserId: result.targetUserId,
          organizationId: result.organizationId,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  stop: RequestHandler = async (req, res, next) => {
    try {
      const staffUserId = req.auth!.realUserId;
      await this.deps.stopImpersonate.execute({
        staffUserId,
        reason: "manual",
      });
      res.clearCookie(IMPERSONATE_COOKIE_NAME, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        path: "/",
      });
      res.clearCookie(IMPERSONATE_ORG_COOKIE_NAME, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        path: "/",
      });
      res.status(200).json({ data: { ok: true } });
    } catch (err) {
      next(err);
    }
  };
}

/** Extrai IP do request preservando o primeiro hop em chains de proxy. */
function extractIp(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string | null {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  if (Array.isArray(fwd) && fwd[0]) return fwd[0].split(",")[0]?.trim() ?? null;
  return req.socket?.remoteAddress ?? null;
}
