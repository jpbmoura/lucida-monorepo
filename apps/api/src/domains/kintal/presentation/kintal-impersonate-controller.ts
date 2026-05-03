import type { RequestHandler } from "express";
import {
  IMPERSONATE_COOKIE_NAME,
  buildImpersonateCookieValue,
  impersonateCookieAttributes,
} from "@/domains/iam/infrastructure/impersonate-cookie.js";
import { env } from "@/env.js";
import type { StartKintalImpersonateUseCase } from "../application/start-kintal-impersonate.js";
import type { StopKintalImpersonateUseCase } from "../application/stop-kintal-impersonate.js";
import { startImpersonateBody } from "./kintal-impersonate-schemas.js";

interface Deps {
  startImpersonate: StartKintalImpersonateUseCase;
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
      res.status(200).json({ data: { ok: true, targetUserId } });
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
