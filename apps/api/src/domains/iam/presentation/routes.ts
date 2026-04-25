import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { Auth } from "../infrastructure/better-auth/auth.js";
import { makeRequireAuth } from "./middleware/require-auth.js";

export function makeIamRouter(auth: Auth): Router {
  const router = Router();
  const requireAuth = makeRequireAuth(auth);

  router.get("/v1/me", requireAuth, async (req, res, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!session) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      const u = session.user as Record<string, unknown> & {
        id: string;
        email: string;
        name?: string | null;
        image?: string | null;
      };
      res.json({
        data: {
          id: u.id,
          email: u.email,
          name: u.name ?? "",
          image: u.image ?? null,
          activeOrganizationId: req.auth!.activeOrganizationId,
          whatsapp: (u.whatsapp as string | undefined) ?? "",
          institutionType: (u.institutionType as string | null | undefined) ?? null,
          gender: (u.gender as string | null | undefined) ?? null,
          teachingLevels: (u.teachingLevels as string[] | undefined) ?? [],
          subjects: (u.subjects as string[] | undefined) ?? [],
          acquisitionChannel:
            (u.acquisitionChannel as string | null | undefined) ?? null,
          stateUf: (u.stateUf as string | null | undefined) ?? null,
          studentsRange: (u.studentsRange as string | null | undefined) ?? null,
          teachingYears: (u.teachingYears as string | null | undefined) ?? null,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
