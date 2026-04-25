import { env } from "@/env.js";
import { buildApp } from "@/main.js";

async function bootstrap(): Promise<void> {
  const app = await buildApp();

  app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("[api] failed to bootstrap", err);
  process.exit(1);
});
