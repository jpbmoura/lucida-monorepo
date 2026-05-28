import { env } from "@/env.js";
import { buildApp } from "@/main.js";

async function bootstrap(): Promise<void> {
  const app = await buildApp();

  const server = app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
  });

  // Geração de prova é uma resposta SSE que pode levar minutos (vários lotes
  // à OpenAI). O heartbeat do controller já mantém a conexão viva no proxy;
  // aqui só garantimos que os timeouts do próprio Node não cortem a resposta.
  // requestTimeout=0 remove o teto de 5min do Node sobre a vida da requisição;
  // headersTimeout > keepAliveTimeout é exigência do Node.
  server.requestTimeout = 0;
  server.keepAliveTimeout = 120_000;
  server.headersTimeout = 125_000;
}

bootstrap().catch((err) => {
  console.error("[api] failed to bootstrap", err);
  process.exit(1);
});
