import express, { type Express, type Router } from "express";
import cors from "cors";
import { env } from "@/env.js";
import { errorHandler } from "@/infrastructure/middlewares/error-handler.js";
import type { Auth } from "@/domains/iam/infrastructure/better-auth/auth.js";
import { makeAuthHandler } from "@/domains/iam/infrastructure/better-auth/handler.js";

interface AppDeps {
  auth: Auth;
  routers: Router[];
  /**
   * Routers que precisam do body BRUTO (usam express.raw() internamente).
   * Montados ANTES do express.json() global — ex.: webhook Stripe.
   */
  rawBodyRouters?: Router[];
}

export function createApp({ auth, routers, rawBodyRouters = [] }: AppDeps): Express {
  const app = express();

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );

  // BetterAuth deve rodar ANTES do express.json() — o handler lê o body cru.
  // Express 5: wildcard deve ser nomeado (/*splat em vez de /*).
  app.all("/api/auth/*splat", makeAuthHandler(auth));

  // Routers que precisam de body bruto também vêm antes do json parser.
  for (const router of rawBodyRouters) {
    app.use(router);
  }

  // 15MB acomoda fotos de folha OMR em base64 (~ 5MB de JPEG → 7MB b64 + margem).
  app.use(express.json({ limit: "15mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  for (const router of routers) {
    app.use(router);
  }

  app.use(errorHandler);

  return app;
}
